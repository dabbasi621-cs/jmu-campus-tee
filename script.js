const SHIRT_PRICE = 35;
const MAX_PER_SIZE = 10;
const SIZES = ["S", "M", "L", "XL", "XXL"];

/*
  ORDER DELIVERY — pick one:

  1) Google Apps Script (recommended for a shared sheet)
     - Create a Google Sheet, Extensions → Apps Script, paste the
       doPost handler from the bottom of this file, Deploy → Web app
       (Anyone can access), then paste the URL here:

  2) FormSubmit — put your inbox email in ORDER_EMAIL instead
*/

const ORDER_ENDPOINT = "https://script.google.com/macros/s/AKfycbwBraj8B14vjL5HHse71GaGJ7krKakiZ-WWHzGHbLh6o--K4J3MK0THnpt1FViHKyapjw/exec";
const ORDER_EMAIL = "";

const quantities = {
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0
};

const summaryLines = document.querySelector("#summaryLines");
const totalPrice = document.querySelector("#totalPrice");
const orderForm = document.querySelector("#orderForm");
const submitButton = document.querySelector("#submitButton");
const formMessage = document.querySelector("#formMessage");

document.querySelectorAll(".size-qty-row").forEach(function (row) {
    const size = row.dataset.size;
    const display = row.querySelector(".qty-display");
    const decrease = row.querySelector(".qty-decrease");
    const increase = row.querySelector(".qty-increase");

    decrease.addEventListener("click", function () {
        if (quantities[size] > 0) {
            quantities[size]--;
            display.textContent = quantities[size];
            updateOrder();
        }
    });

    increase.addEventListener("click", function () {
        if (quantities[size] < MAX_PER_SIZE) {
            quantities[size]++;
            display.textContent = quantities[size];
            updateOrder();
        }
    });
});

function getSelectedItems() {
    return SIZES
        .filter(function (size) {
            return quantities[size] > 0;
        })
        .map(function (size) {
            return {
                size: size,
                quantity: quantities[size],
                subtotal: quantities[size] * SHIRT_PRICE
            };
        });
}

function getTotalQuantity() {
    return SIZES.reduce(function (sum, size) {
        return sum + quantities[size];
    }, 0);
}

function updateOrder() {
    const items = getSelectedItems();
    const totalQty = getTotalQuantity();

    if (items.length === 0) {
        summaryLines.innerHTML =
            '<p class="summary-empty">No sizes selected yet</p>';
    } else {
        summaryLines.innerHTML = items
            .map(function (item) {
                return (
                    '<div class="summary-line">' +
                    "<span>Size " +
                    item.size +
                    " × " +
                    item.quantity +
                    "</span>" +
                    "<span>$" +
                    item.subtotal +
                    "</span>" +
                    "</div>"
                );
            })
            .join("");
    }

    totalPrice.textContent = "$" + totalQty * SHIRT_PRICE;
}

function buildOrder() {
    const items = getSelectedItems();
    const totalQty = getTotalQuantity();

    return {
        name: document.querySelector("#name").value.trim(),
        email: document.querySelector("#email").value.trim(),
        phone: document.querySelector("#phone").value.trim(),
        items: items,
        sizesSummary: items
            .map(function (item) {
                return item.size + "×" + item.quantity;
            })
            .join(", "),
        quantity: totalQty,
        total: totalQty * SHIRT_PRICE,
        submittedAt: new Date().toISOString()
    };
}

function saveOrderLocally(order) {
    try {
        const key = "jmuCampusTeeOrders";
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.push(order);
        localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
        console.warn("Could not save order locally.", error);
    }
}

function submitViaGoogleScript(order) {
    return fetch(ORDER_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(order)
    });
}

function submitViaFormSubmit(order) {
    return fetch("https://formsubmit.co/ajax/" + ORDER_EMAIL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({
            _subject: "JMU Campus Tee order — " + order.name,
            name: order.name,
            email: order.email || "not provided",
            phone: order.phone || "not provided",
            sizes: order.sizesSummary,
            quantity: order.quantity,
            total: "$" + order.total,
            message:
                order.name +
                " ordered " +
                order.sizesSummary +
                " (" +
                order.quantity +
                " shirts, $" +
                order.total +
                ")"
        })
    }).then(function (response) {
        if (!response.ok) {
            throw new Error("FormSubmit request failed");
        }
        return response.json();
    });
}

orderForm.addEventListener("submit", function (event) {
    event.preventDefault();

    formMessage.textContent = "";
    formMessage.className = "form-message";

    const order = buildOrder();

    if (order.name === "") {
        showError("Please enter your name.");
        return;
    }

    if (order.email === "" && order.phone === "") {
        showError("Please enter an email address or phone number.");
        return;
    }

    if (order.quantity < 1) {
        showError("Please add at least one shirt size.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    let delivery;

    if (ORDER_ENDPOINT) {
        delivery = submitViaGoogleScript(order);
    } else if (ORDER_EMAIL) {
        delivery = submitViaFormSubmit(order);
    } else {
        delivery = Promise.resolve();
    }

    delivery
        .then(function () {
            saveOrderLocally(order);
            showSuccess();
        })
        .catch(function () {
            saveOrderLocally(order);
            showError(
                "We saved your order on this device, but sending failed. Please try again or contact us directly."
            );
            submitButton.disabled = false;
            submitButton.textContent = "Place Order";
        });
});

function showError(message) {
    formMessage.textContent = message;
    formMessage.className = "form-message error";
}

function showSuccess() {
    submitButton.textContent = "Order Received";
    formMessage.textContent =
        "Thanks for your order! We’ll contact you with payment and pickup information.";
    formMessage.className = "form-message success";
    orderForm.reset();

    SIZES.forEach(function (size) {
        quantities[size] = 0;
    });

    document.querySelectorAll(".qty-display").forEach(function (display) {
        display.textContent = "0";
    });

    updateOrder();
}

const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
    function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                revealObserver.unobserve(entry.target);
            }
        });
    },
    {
        threshold: 0.12
    }
);

revealElements.forEach(function (element) {
    revealObserver.observe(element);
});

updateOrder();

/*
  Google Apps Script — paste into Extensions → Apps Script on a Sheet:

  function doPost(e) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      new Date(),
      data.name,
      data.email,
      data.phone,
      data.sizesSummary,
      data.quantity,
      data.total
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }
*/
