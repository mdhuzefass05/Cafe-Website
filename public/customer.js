const API_BASE = '/api';

// --- STATE ---
let fullMenu = [];
let cart = []; // Array of { id, name, price, qty }

// --- DOM ELEMENTS ---
const menuGrid = document.getElementById('customerMenuGrid');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartBadge = document.getElementById('cartBadge');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotalElement = document.getElementById('cartTotal');
const cartNotesInput = document.getElementById('cartNotes');

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
    fetchMenu();
    setupForms();
});

// --- MENU LOGIC ---
async function fetchMenu() {
    try {
        const res = await fetch(`${API_BASE}/menu`);
        if (res.ok) {
            fullMenu = await res.json();
            renderMenu();
        } else {
            menuGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 40px;">Failed to load menu.</div>`;
        }
    } catch (err) {
        console.error('Error fetching menu:', err);
    }
}

function renderMenu() {
    menuGrid.innerHTML = '';

    // Filter out unavailable items if you want, or just show them differently. We'll only show available items.
    const availableItems = fullMenu.filter(item => item.is_available === 1);

    if (availableItems.length === 0) {
        menuGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No items available right now.</div>`;
        return;
    }

    availableItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-card glass-panel fade-in';
        card.innerHTML = `
            <div>
                <h3>${item.name}</h3>
                <p class="cat">${item.category}</p>
            </div>
            <div>
                <div class="price">₹${item.price.toFixed(2)}</div>
                <button class="btn-primary" style="padding: 8px 15px; font-size: 0.9rem;" onclick="addToCart(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${item.price})">
                    <i class="fa-solid fa-plus"></i> Add
                </button>
            </div>
        `;
        menuGrid.appendChild(card);
    });
}

// --- CART LOGIC ---
window.toggleCart = () => {
    cartSidebar.classList.toggle('open');
    cartOverlay.style.display = cartSidebar.classList.contains('open') ? 'block' : 'none';
};

window.addToCart = (id, name, price) => {
    const existingIndex = cart.findIndex(i => i.name === name);
    if (existingIndex > -1) {
        cart[existingIndex].qty += 1;
    } else {
        cart.push({ id, name, price, qty: 1 });
    }
    updateCartUI();

    // Tiny bounce effect on the cart button
    const btn = document.querySelector('.cart-btn');
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => btn.style.transform = '', 200);
};

window.updateCartQty = (index, delta) => {
    if (cart[index]) {
        cart[index].qty += delta;
        if (cart[index].qty <= 0) {
            cart.splice(index, 1);
        }
        updateCartUI();
    }
};

function updateCartUI() {
    let totalItems = 0;
    let totalPrice = 0;

    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<p style="text-align:center; color: var(--text-secondary); margin-top:50px;">Your cart is empty.</p>`;
        cartBadge.innerText = 0;
        cartTotalElement.innerText = '₹0.00';
        return;
    }

    cart.forEach((item, index) => {
        totalItems += item.qty;
        totalPrice += (item.price * item.qty);

        const row = document.createElement('div');
        row.className = 'cart-item fade-in';
        row.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">₹${(item.price * item.qty).toFixed(2)}</div>
            </div>
            <div class="qty-controls">
                <button class="qty-btn" onclick="updateCartQty(${index}, -1)"><i class="fa-solid fa-minus"></i></button>
                <span style="font-weight:bold;">${item.qty}</span>
                <button class="qty-btn" onclick="updateCartQty(${index}, 1)"><i class="fa-solid fa-plus"></i></button>
            </div>
        `;
        cartItemsContainer.appendChild(row);
    });

    cartBadge.innerText = totalItems;
    cartTotalElement.innerText = '₹' + totalPrice.toFixed(2);
}

window.checkout = async () => {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    // Build items string for backend
    const itemsString = cart.map(item => `${item.qty}x ${item.name}`).join(', ');
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const notes = cartNotesInput.value;
    const customerName = document.getElementById('cartCustomerName')?.value.trim();

    if (!customerName) {
        alert("Please enter your name to place the order!");
        return;
    }

    const payload = {
        customer_name: customerName,
        items: itemsString,
        total_price: totalPrice,
        status: 'pending',
        notes: notes,
        discount: 0
    };

    const btn = document.getElementById('checkoutBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    try {
        const res = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(`Order #${data.id} placed successfully! We'll start making it right away.`);
            cart = [];
            cartNotesInput.value = '';
            if (document.getElementById('cartCustomerName')) document.getElementById('cartCustomerName').value = '';
            updateCartUI();
            toggleCart();
        } else {
            alert("Failed to submit order. Please try again.");
        }
    } catch (err) {
        console.error(err);
        alert("Network error.");
    } finally {
        btn.disabled = false;
        btn.innerText = 'Submit Order';
    }
};

// --- FORMS LOGIC ---
function setupForms() {
    // Reservation Form
    document.getElementById('customerReservationForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            customer_name: document.getElementById('resName').value,
            table_number: parseInt(document.getElementById('resTable').value, 10),
            guests: parseInt(document.getElementById('resGuests').value, 10),
            reservation_time: document.getElementById('resTime').value
        };

        try {
            const res = await fetch(`${API_BASE}/reservations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Table requested! See you then.");
                e.target.reset();
            } else {
                alert("Error submitting reservation.");
            }
        } catch (err) {
            console.error(err);
        }
    });

    // Feedback Form
    document.getElementById('customerFeedbackForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            customer_name: document.getElementById('fbName').value || 'Anonymous',
            rating: parseInt(document.getElementById('fbRating').value, 10),
            message: document.getElementById('fbMessage').value
        };

        try {
            const res = await fetch(`${API_BASE}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Thank you for your feedback!");
                e.target.reset();
            } else {
                alert("Error submitting feedback.");
            }
        } catch (err) {
            console.error(err);
        }
    });
}
