const SHIRT_PRICE = 40;
const MAX_PER_SIZE = 10;
const SIZES = ["S", "M", "L", "XL", "XXL"];

const CHECKOUT_ENDPOINT =
    "https://purple-profit-checkout.dabbasi621.workers.dev/";

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

orderForm.addEventListener("submit", function (event) {
    event.preventDefault();

    formMessage.textContent = "";
    formMessage.className = "form-message";

    const items = getSelectedItems();

    if (items.length === 0) {
        showError("Please add at least one shirt size.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Opening Square...";

    fetch(CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            items: items.map(function (item) {
                return {
                    size: item.size,
                    quantity: item.quantity
                };
            })
        })
    })
        .then(function (response) {
            return response.json().then(function (data) {
                if (!response.ok) {
                    throw new Error(
                        data.error || "Unable to create checkout."
                    );
                }

                return data;
            });
        })
        .then(function (data) {
            if (!data.url) {
                throw new Error(
                    "Square checkout link was not returned."
                );
            }

            window.location.href = data.url;
        })
        .catch(function (error) {
            console.error("Checkout error:", error);

            showError(
                error.message || "We couldn't open Square checkout. Please try again."
            );

            submitButton.disabled = false;
            submitButton.textContent = "Continue to Payment";
        });
});

function showError(message) {
    formMessage.textContent = message;
    formMessage.className = "form-message error";
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

window.addEventListener("pageshow", function () {
    submitButton.disabled = false;
    submitButton.textContent = "Continue to Payment";
});
