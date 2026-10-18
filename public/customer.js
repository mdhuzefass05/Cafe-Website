const API_BASE = '/api';

// --- STATE ---
let fullMenu = [];
let activeCategory = 'ALL';
let searchQuery = '';
let cart = []; // Array of { id, name, price, qty }
let lastPlacedOrderId = null;

// Icons mapping for menu categories/items
const categoryIcons = {
    'Coffee': 'fa-mug-hot',
    'Tea': 'fa-mug-saucer',
    'Bakery': 'fa-bread-slice',
    'Snacks': 'fa-cookie-bite',
    'Beverages': 'fa-glass-water',
    'Desserts': 'fa-cake-candles',
    'Default': 'fa-utensils'
};

// High-resolution photography mapping for menu items & categories
const defaultItemImages = {
    'vanilla latte': 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80',
    'cold brew': 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
    'espresso': 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80',
    'matcha green tea': 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
    'blueberry muffin': 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=600&q=80',
    'chocolate croissant': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
    'nachos': 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=600&q=80',

    // Category fallbacks
    'coffee': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
    'tea': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
    'pastry': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
    'snacks': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
    'beverages': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80',
    'desserts': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
    'default': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80'
};

function getItemImage(item) {
    if (item.image_url) return item.image_url;
    const nameLower = (item.name || '').toLowerCase().trim();
    const catLower = (item.category || '').toLowerCase().trim();

    for (const [key, url] of Object.entries(defaultItemImages)) {
        if (nameLower.includes(key)) return url;
    }
    for (const [key, url] of Object.entries(defaultItemImages)) {
        if (catLower.includes(key)) return url;
    }
    return defaultItemImages['default'];
}

// --- DOM ELEMENTS ---
const menuGrid = document.getElementById('customerMenuGrid');
const menuSearch = document.getElementById('menuSearch');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const categoryPills = document.getElementById('categoryPills');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartBadge = document.getElementById('cartBadge');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotalElement = document.getElementById('cartTotal');
const cartNotesInput = document.getElementById('cartNotes');
const toastContainer = document.getElementById('toastContainer');
const orderModal = document.getElementById('orderModal');

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
    fetchMenu();
    setupFiltersAndSearch();
    setupForms();
    renderRecentOrders();
    fetchRecentFeedback();
});

// --- TOAST NOTIFICATIONS ---
function showToast(message, icon = 'fa-circle-check') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color: var(--gold-primary); font-size: 1.2rem;"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// --- MENU LOGIC & FILTERING ---
async function fetchMenu() {
    try {
        const res = await fetch(`${API_BASE}/menu`);
        if (res.ok) {
            fullMenu = await res.json();
            renderMenu();
        } else {
            menuGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 40px;">Failed to load menu items.</div>`;
        }
    } catch (err) {
        console.error('Error fetching menu:', err);
        menuGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 40px;">Server connection error.</div>`;
    }
}

function setupFiltersAndSearch() {
    // Search listener
    menuSearch?.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderMenu();
    });

    clearSearchBtn?.addEventListener('click', () => {
        menuSearch.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderMenu();
    });

    // Category pills listener
    categoryPills?.addEventListener('click', (e) => {
        const pill = e.target.closest('.cat-pill');
        if (!pill) return;

        document.querySelectorAll('.cat-pill').forEach(btn => btn.classList.remove('active'));
        pill.classList.add('active');

        activeCategory = pill.getAttribute('data-category');
        renderMenu();
    });
}

function renderMenu() {
    menuGrid.innerHTML = '';

    // Filter available items based on category & search term
    const filtered = fullMenu.filter(item => {
        const isAvailable = item.is_available === 1;
        if (!isAvailable) return false;

        const matchesCat = activeCategory === 'ALL' || (item.category && item.category.toLowerCase() === activeCategory.toLowerCase());
        const matchesSearch = !searchQuery ||
            item.name.toLowerCase().includes(searchQuery) ||
            (item.category && item.category.toLowerCase().includes(searchQuery)) ||
            (item.description && item.description.toLowerCase().includes(searchQuery));

        return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
        menuGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 60px;">
                <i class="fa-solid fa-mug-saucer" style="font-size: 2.5rem; color: rgba(255,255,255,0.2); margin-bottom: 15px;"></i>
                <p>No items found matching your criteria.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(item => {
        const iconClass = categoryIcons[item.category] || categoryIcons['Default'];
        const imageUrl = getItemImage(item);

        const card = document.createElement('div');
        card.className = 'spatial-menu-card fade-in';
        card.innerHTML = `
            <div class="menu-img-wrapper">
                <img src="${imageUrl}" alt="${item.name}" loading="lazy" class="menu-card-img">
                <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(18,18,28,0.85) 100%);"></div>
                <span style="position: absolute; top: 14px; left: 14px; background: rgba(18,18,28,0.85); backdrop-filter: blur(10px); border: 1px solid rgba(226,183,68,0.4); color: var(--spatial-gold); padding: 5px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="fa-solid ${iconClass}"></i> ${item.category || 'Special'}
                </span>
            </div>
            <div style="padding: 22px; display: flex; flex-direction: column; flex: 1; justify-content: space-between;">
                <div>
                    <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 1.3rem; font-weight: 700; color: #fff;">${item.name}</h3>
                    <p class="desc" style="font-size: 0.9rem; color: rgba(255,255,255,0.65); line-height: 1.5; margin-bottom: 20px; min-height: 40px;">
                        ${item.description || 'Handcrafted fresh using premium artisan ingredients.'}
                    </p>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.08);">
                    <div style="font-size: 1.55rem; font-weight: 800; color: #ffffff;">₹${item.price.toFixed(2)}</div>
                    <button class="btn-add-spatial" onclick="addToCart(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${item.price})">
                        <i class="fa-solid fa-plus"></i> Add
                    </button>
                </div>
            </div>
        `;

        // Interactive 3D Spatial Tilt Handler
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            const tiltX = (y / (rect.height / 2)) * -8;
            const tiltY = (x / (rect.width / 2)) * 8;

            card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(12px) translateY(-6px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) translateY(0px)`;
        });

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
    showToast(`Added ${name} to cart`);

    // Bounce cart icon
    const btn = document.querySelector('.cart-btn');
    btn.style.transform = 'scale(1.25)';
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
        cartItemsContainer.innerHTML = `
            <div style="text-align:center; color: var(--text-secondary); margin-top:60px;">
                <i class="fa-solid fa-basket-shopping" style="font-size: 3rem; color: rgba(255,255,255,0.15); margin-bottom: 15px;"></i>
                <p>Your cart is empty.</p>
            </div>
        `;
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
                <div class="cart-item-price">₹${(item.price * item.qty).toFixed(2)} (${item.qty} × ₹${item.price.toFixed(2)})</div>
            </div>
            <div class="qty-controls">
                <button class="qty-btn" onclick="updateCartQty(${index}, -1)"><i class="fa-solid fa-minus"></i></button>
                <span style="font-weight:bold; min-width:18px; text-align:center;">${item.qty}</span>
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
        showToast("Your cart is empty!", "fa-triangle-exclamation");
        return;
    }

    const customerName = document.getElementById('cartCustomerName')?.value.trim();
    if (!customerName) {
        showToast("Please enter your name to place the order!", "fa-user-large");
        document.getElementById('cartCustomerName')?.focus();
        return;
    }

    const itemsString = cart.map(item => `${item.qty}x ${item.name}`).join(', ');
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const notes = cartNotesInput.value;

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
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Placing Order...';

    try {
        const res = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            lastPlacedOrderId = data.id;

            // Save to recent local storage orders
            saveRecentOrder(data.id, customerName, totalPrice);

            // Populate Modal
            document.getElementById('modalOrderId').innerText = `#${data.id}`;
            document.getElementById('modalCustomerName').innerText = customerName;
            document.getElementById('modalOrderItems').innerText = itemsString;
            document.getElementById('modalOrderTotal').innerText = `₹${totalPrice.toFixed(2)}`;

            // Reset cart
            cart = [];
            cartNotesInput.value = '';
            updateCartUI();
            toggleCart();

            // Show Order Receipt Modal
            orderModal.style.display = 'flex';
            showToast(`Order #${data.id} placed successfully!`, 'fa-circle-check');
        } else {
            showToast("Failed to submit order. Please try again.", "fa-triangle-exclamation");
        }
    } catch (err) {
        console.error(err);
        showToast("Network error submitting order.", "fa-wifi");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check-circle" style="margin-right: 8px;"></i> Place Order Now';
    }
};

window.closeOrderModal = () => {
    orderModal.style.display = 'none';
};

window.closeOrderModalAndTrack = () => {
    orderModal.style.display = 'none';
    if (lastPlacedOrderId) {
        document.getElementById('trackOrderIdInput').value = lastPlacedOrderId;
        document.getElementById('tracker').scrollIntoView();
        trackOrder();
    }
};

// --- TABLE SEATING MAP & TIME SLOT SELECTION ---
window.selectTable = (element) => {
    document.querySelectorAll('.spatial-table-chip').forEach(chip => chip.classList.remove('active'));
    element.classList.add('active');
    const tableVal = element.getAttribute('data-table');
    document.getElementById('selectedTableInput').value = tableVal;
    showToast(`Selected ${tableVal}`, 'fa-couch');
};

window.selectTimeSlot = (time, element) => {
    document.querySelectorAll('.time-pill').forEach(pill => pill.classList.remove('active'));
    element.classList.add('active');
    showToast(`Time slot: ${time}`, 'fa-clock');
};

window.adjustGuests = (delta) => {
    const input = document.getElementById('resGuests');
    if (!input) return;
    let val = parseInt(input.value || '2', 10) + delta;
    if (val < 1) val = 1;
    if (val > 20) val = 20;
    input.value = val;
};

// --- EMOJI RATING SELECTION ---
window.selectEmojiRating = (rating, element) => {
    document.querySelectorAll('.emoji-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('fbRatingInput').value = rating;
};

// --- RECENT ORDERS & ORDER TRACKER ---
function saveRecentOrder(id, name, total) {
    let recent = JSON.parse(localStorage.getItem('brewcafe_recent_orders') || '[]');
    recent = recent.filter(o => o.id !== id);
    recent.unshift({ id, name, total, date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    if (recent.length > 5) recent.pop();
    localStorage.setItem('brewcafe_recent_orders', JSON.stringify(recent));
    renderRecentOrders();
}

function renderRecentOrders() {
    const recentContainer = document.getElementById('recentOrdersContainer');
    const recentList = document.getElementById('recentOrdersList');
    let recent = JSON.parse(localStorage.getItem('brewcafe_recent_orders') || '[]');

    if (recent.length === 0) {
        recentContainer.style.display = 'none';
        return;
    }

    recentContainer.style.display = 'block';
    recentList.innerHTML = '';
    recent.forEach(o => {
        const badge = document.createElement('div');
        badge.className = 'recent-order-badge';
        badge.innerHTML = `<i class="fa-solid fa-receipt"></i> #${o.id} (₹${o.total.toFixed(0)})`;
        badge.onclick = () => {
            document.getElementById('trackOrderIdInput').value = o.id;
            trackOrder();
        };
        recentList.appendChild(badge);
    });
}

window.trackOrder = async () => {
    const orderId = document.getElementById('trackOrderIdInput').value.trim();
    const resultDiv = document.getElementById('trackerResult');

    if (!orderId) {
        showToast("Please enter an Order ID!", "fa-circle-exclamation");
        return;
    }

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div style="text-align: center; padding: 25px;">
            <div class="radar-scanner-box">
                <div class="radar-sweep-line"></div>
                <i class="fa-solid fa-satellite-dish" style="color:var(--spatial-gold); font-size:1.8rem; z-index:2;"></i>
            </div>
            <p style="color: rgba(255,255,255,0.7); font-weight: 600; font-size: 0.95rem;">Scanning spatial telemetry for Order #${orderId}...</p>
        </div>
    `;

    try {
        const res = await fetch(`${API_BASE}/orders/${orderId}`);
        if (res.status === 404) {
            resultDiv.innerHTML = `
                <div style="text-align: center; padding: 25px; color: var(--danger);">
                    <i class="fa-solid fa-circle-xmark" style="font-size: 2.2rem; margin-bottom: 10px;"></i>
                    <p style="font-size: 1.05rem; font-weight: 600;">Order #${orderId} Not Found</p>
                    <p style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">Please check your receipt or order history badge.</p>
                </div>
            `;
            return;
        }

        if (!res.ok) throw new Error('Error fetching order');

        const order = await res.json();
        const status = (order.status || 'pending').toLowerCase();

        const isReceived = true;
        const isPreparing = status === 'preparing' || status === 'completed';
        const isCompleted = status === 'completed';
        const isCancelled = status === 'cancelled';

        if (isCancelled) {
            resultDiv.innerHTML = `
                <div class="order-status-card fade-in" style="border-color: var(--danger);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div>
                            <h3 style="margin: 0; font-size: 1.3rem;">Order #${order.id}</h3>
                            <span style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">Customer: ${order.customer_name || 'Guest'}</span>
                        </div>
                        <span style="background: rgba(231,76,60,0.2); color: var(--danger); padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 0.9rem;">Cancelled</span>
                    </div>
                    <p style="color: rgba(255,255,255,0.7); font-size: 0.95rem;">This order was cancelled. Please check with cafe staff.</p>
                </div>
            `;
            return;
        }

        resultDiv.innerHTML = `
            <div class="order-status-card fade-in">
                <!-- Header Info -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <h3 style="margin: 0; font-size: 1.35rem; font-weight:800;">Order #${order.id}</h3>
                            <span style="background: rgba(226,183,68,0.18); color: var(--spatial-gold); border: 1px solid rgba(226,183,68,0.4); padding: 3px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Live Telemetry</span>
                        </div>
                        <span style="color: rgba(255,255,255,0.7); font-size: 0.92rem; margin-top:4px; display:block;">Customer: <strong>${order.customer_name || 'Guest'}</strong></span>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: var(--spatial-gold); font-weight: 800; font-size: 1.4rem;">₹${order.total_price.toFixed(2)}</span>
                        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.5);"><i class="fa-solid fa-hourglass-half"></i> ${isCompleted ? 'Served' : '~8 Mins Prep Left'}</div>
                    </div>
                </div>

                <!-- Stage Stepper -->
                <div class="status-stepper">
                    <div class="step-item ${isReceived ? 'completed' : ''}">
                        <div class="step-icon"><i class="fa-solid fa-receipt"></i></div>
                        <div class="step-label">Received</div>
                    </div>
                    <div class="step-item ${isCompleted ? 'completed' : (isPreparing ? 'active' : '')}">
                        <div class="step-icon"><i class="fa-solid fa-fire-burner"></i></div>
                        <div class="step-label">Preparing</div>
                    </div>
                    <div class="step-item ${isCompleted ? 'completed' : ''}">
                        <div class="step-icon"><i class="fa-solid fa-mug-hot"></i></div>
                        <div class="step-label">Ready / Served</div>
                    </div>
                </div>

                <!-- Digital Receipt & Barcode Visual -->
                <div style="background: rgba(0,0,0,0.3); padding: 18px; border-radius: 16px; margin-top: 20px; border: 1px dashed rgba(255,255,255,0.15);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                        <span style="font-size: 0.85rem; color: rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:0.5px;">Itemized Breakdown</span>
                        <span style="font-family: monospace; font-size:0.75rem; color:rgba(255,255,255,0.4);">||||| ||| | |||||</span>
                    </div>
                    <div style="color: white; font-weight: 600; font-size:1.02rem;">${order.items}</div>
                    ${order.notes ? `<div style="font-size: 0.88rem; color: var(--spatial-gold); margin-top: 8px;"><i class="fa-solid fa-pen"></i> Notes: ${order.notes}</div>` : ''}
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        resultDiv.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 20px;">Failed to query order telemetry details.</div>`;
    }
};

// --- FORMS LOGIC ---
function setupForms() {
    // Reservation Form
    document.getElementById('customerReservationForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Reservation...';

        const selectedTable = document.getElementById('selectedTableInput')?.value || 'Table 01';
        const userNotes = document.getElementById('resRequests').value.trim();
        const fullNotes = userNotes ? `[${selectedTable}] ${userNotes}` : `[${selectedTable}]`;

        const payload = {
            customer_name: document.getElementById('resName').value,
            contact_info: document.getElementById('resContact').value,
            guests: parseInt(document.getElementById('resGuests').value, 10),
            reservation_time: document.getElementById('resTime').value,
            special_requests: fullNotes
        };

        try {
            const res = await fetch(`${API_BASE}/reservations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast(`Table booking confirmed for ${selectedTable}!`, "fa-calendar-check");
                e.target.reset();
            } else {
                showToast("Error submitting table reservation.", "fa-circle-xmark");
            }
        } catch (err) {
            console.error(err);
            showToast("Network error submitting reservation.", "fa-wifi");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Reserve Selected Table';
        }
    });

    // Feedback Form
    document.getElementById('customerFeedbackForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Review...';

        const ratingVal = parseInt(document.getElementById('fbRatingInput')?.value || '5', 10);
        const payload = {
            customer_name: document.getElementById('fbName').value.trim() || 'Anonymous Coffee Lover',
            rating: ratingVal,
            message: document.getElementById('fbMessage').value.trim()
        };

        try {
            const res = await fetch(`${API_BASE}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast("Thank you for sharing your experience!", "fa-heart");
                e.target.reset();
                fetchRecentFeedback();
            } else {
                showToast("Error submitting feedback.", "fa-circle-xmark");
            }
        } catch (err) {
            console.error(err);
            showToast("Network error submitting feedback.", "fa-wifi");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Share My Experience';
        }
    });
}

// --- SPATIAL TESTIMONIAL REVIEW WALL ---
async function fetchRecentFeedback() {
    const wall = document.getElementById('feedbackWall');
    if (!wall) return;

    try {
        const res = await fetch(`${API_BASE}/feedback`);
        if (res.ok) {
            const reviews = await res.json();
            renderFeedbackWall(reviews);
        }
    } catch (err) {
        console.error('Error fetching feedback:', err);
    }
}

function renderFeedbackWall(reviews) {
    const wall = document.getElementById('feedbackWall');
    if (!wall) return;

    wall.innerHTML = '';
    const recentReviews = Array.isArray(reviews) ? reviews.slice(0, 6) : [];

    if (recentReviews.length === 0) {
        wall.innerHTML = `<p style="text-align: center; color: rgba(255,255,255,0.6); grid-column: 1/-1;">Be the first to share your cafe review!</p>`;
        return;
    }

    recentReviews.forEach(r => {
        const name = r.customer_name || 'Coffee Enthusiast';
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=80`;
        const starsHtml = '⭐'.repeat(r.rating || 5);

        const card = document.createElement('div');
        card.className = 'spatial-card fade-in';
        card.style.padding = '22px';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${avatarUrl}" alt="${name}" style="width: 42px; height: 42px; border-radius: 50%; border: 1.5px solid var(--spatial-gold);">
                    <div>
                        <strong style="color: #fff; font-size: 0.98rem; display: block;">${name}</strong>
                        <span style="color: rgba(255,255,255,0.5); font-size: 0.78rem;"><i class="fa-solid fa-circle-check" style="color:#2ecc71;"></i> Verified Guest</span>
                    </div>
                </div>
                <div style="font-size: 0.9rem;">${starsHtml}</div>
            </div>
            <p style="color: rgba(255,255,255,0.85); font-size: 0.95rem; font-style: italic; line-height: 1.55; margin-bottom: 14px;">
                <i class="fa-solid fa-quote-left" style="color: var(--spatial-gold); opacity: 0.5; margin-right: 4px;"></i>
                ${r.message}
                <i class="fa-solid fa-quote-right" style="color: var(--spatial-gold); opacity: 0.5; margin-left: 4px;"></i>
            </p>
            <div style="text-align: right; font-size: 0.78rem; color: rgba(255,255,255,0.4);">
                ${new Date(r.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
        `;
        wall.appendChild(card);
    });
}

// ============================================================
// LIBRARY — Customer Interface
// ============================================================
let allLibBooks = [];
let libActiveGenre = 'ALL';
let libSearchText = '';
let bookRequestTarget = null;

const BOOK_GENRE_COLORS = {
    'Fiction':     { bg: 'rgba(155,89,182,0.18)', border: 'rgba(155,89,182,0.45)', text: '#c39bd3' },
    'Non-Fiction': { bg: 'rgba(52,152,219,0.18)', border: 'rgba(52,152,219,0.45)', text: '#7fb3d3' },
    'Mystery':     { bg: 'rgba(231,76,60,0.18)',  border: 'rgba(231,76,60,0.45)',  text: '#e59f98' },
    'Science':     { bg: 'rgba(46,204,113,0.18)', border: 'rgba(46,204,113,0.45)', text: '#82e0aa' },
    'History':     { bg: 'rgba(230,126,34,0.18)', border: 'rgba(230,126,34,0.45)', text: '#f0b27a' },
    'Philosophy':  { bg: 'rgba(26,188,156,0.18)', border: 'rgba(26,188,156,0.45)', text: '#76d7c4' },
    'Biography':   { bg: 'rgba(241,196,15,0.18)', border: 'rgba(241,196,15,0.45)', text: '#f9e79f' },
    'default':     { bg: 'rgba(226,183,68,0.12)', border: 'rgba(226,183,68,0.35)', text: '#e2b744' },
};

function getGenreStyle(genre) {
    return BOOK_GENRE_COLORS[genre] || BOOK_GENRE_COLORS['default'];
}

async function fetchLibraryBooks() {
    try {
        const res = await fetch(`${API_BASE}/library/books`);
        if (!res.ok) throw new Error('API error');
        allLibBooks = await res.json();
        renderLibraryUI();
    } catch (e) {
        const grid = document.getElementById('libBookGrid');
        if (grid) grid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px 0; color:rgba(255,255,255,0.4);">
                <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem; margin-bottom:14px; display:block; color:#e74c3c;"></i>
                Could not load library. Please try again later.
            </div>`;
    }
}

function renderLibraryUI() {
    const books = allLibBooks;
    const available = books.filter(b => b.available_copies > 0).length;
    const genres = [...new Set(books.map(b => b.genre).filter(Boolean))];

    const elTotal = document.getElementById('libTotalBooks');
    const elAvail = document.getElementById('libAvailBooks');
    const elGenre = document.getElementById('libGenreCount');
    if (elTotal) elTotal.textContent = books.length;
    if (elAvail) elAvail.textContent = available;
    if (elGenre) elGenre.textContent = genres.length;

    // Genre pills
    const pillsContainer = document.getElementById('libGenrePills');
    if (pillsContainer) {
        pillsContainer.innerHTML = `<button class="cat-pill${libActiveGenre === 'ALL' ? ' active' : ''}" data-genre="ALL" onclick="filterLibraryByGenre('ALL', this)">All Books</button>`;
        genres.forEach(g => {
            const btn = document.createElement('button');
            btn.className = 'cat-pill' + (libActiveGenre === g ? ' active' : '');
            btn.dataset.genre = g;
            btn.setAttribute('onclick', `filterLibraryByGenre('${g}', this)`);
            btn.textContent = g;
            pillsContainer.appendChild(btn);
        });
    }

    renderLibraryGrid();
}

function renderLibraryGrid() {
    const grid = document.getElementById('libBookGrid');
    if (!grid) return;
    const query = libSearchText.toLowerCase();

    const filtered = allLibBooks.filter(b => {
        const matchesGenre = libActiveGenre === 'ALL' || b.genre === libActiveGenre;
        const matchesSearch = !query ||
            (b.title || '').toLowerCase().includes(query) ||
            (b.author || '').toLowerCase().includes(query) ||
            (b.genre || '').toLowerCase().includes(query) ||
            (b.description || '').toLowerCase().includes(query);
        return matchesGenre && matchesSearch;
    });

    if (!filtered.length) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px 0; color:rgba(255,255,255,0.4);">
            <i class="fa-solid fa-magnifying-glass" style="font-size:2rem; margin-bottom:14px; display:block;"></i>
            No books match your search.
        </div>`;
        return;
    }

    grid.innerHTML = '';
    filtered.forEach((book, i) => {
        grid.appendChild(createBookCard(book, i));
    });
}

function createBookCard(book, index) {
    const style = getGenreStyle(book.genre);
    const isAvail = book.available_copies > 0;
    const card = document.createElement('div');
    card.className = 'spatial-card fade-in';
    card.style.cssText = `
        padding: 0; overflow: hidden;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        animation-delay: ${index * 0.05}s;
        border: 1px solid ${isAvail ? style.border : 'rgba(255,255,255,0.08)'};
    `;
    card.onmouseenter = () => {
        card.style.transform = 'translateY(-6px) scale(1.02)';
        card.style.boxShadow = `0 20px 50px rgba(0,0,0,0.6), 0 0 20px ${style.border}`;
    };
    card.onmouseleave = () => { card.style.transform = ''; card.style.boxShadow = ''; };

    const spine = document.createElement('div');
    spine.style.cssText = `height:6px; background:linear-gradient(90deg,${style.border},${style.bg}); width:100%;`;
    card.appendChild(spine);

    const body = document.createElement('div');
    body.style.padding = '22px';
    body.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <div style="background:${style.bg}; border:1px solid ${style.border}; color:${style.text}; font-size:0.72rem; font-weight:700; padding:4px 10px; border-radius:20px;">
                ${book.genre || 'General'}
            </div>
            <div style="font-size:0.78rem; font-weight:700; padding:4px 10px; border-radius:20px; ${isAvail
                ? `background:rgba(46,204,113,0.15); color:#2ecc71; border:1px solid rgba(46,204,113,0.3);`
                : `background:rgba(231,76,60,0.12); color:#e74c3c; border:1px solid rgba(231,76,60,0.25);`}">
                ${isAvail ? `&#10003; ${book.available_copies} Available` : '&#10005; Checked Out'}
            </div>
        </div>
        <div style="font-size:2.2rem; margin-bottom:10px;">&#128218;</div>
        <h3 style="font-size:1.08rem; font-weight:800; color:#fff; margin:0 0 6px; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
            ${book.title}
        </h3>
        <div style="font-size:0.82rem; color:rgba(255,255,255,0.55); margin-bottom:12px;">
            <i class="fa-solid fa-feather-pointed" style="color:${style.text}; margin-right:4px;"></i>${book.author}
        </div>
        ${book.description ? `<p style="font-size:0.83rem; color:rgba(255,255,255,0.55); line-height:1.55; margin-bottom:16px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${book.description}</p>` : ''}
        <div style="display:flex; gap:10px; margin-bottom:16px; font-size:0.78rem; color:rgba(255,255,255,0.4); flex-wrap:wrap;">
            ${book.total_copies ? `<span><i class="fa-solid fa-copy"></i> ${book.total_copies} copies</span>` : ''}
            ${book.isbn ? `<span><i class="fa-solid fa-barcode"></i> ${book.isbn}</span>` : ''}
        </div>
        <button onclick="openBookRequestModal(${book.id})" ${!isAvail ? 'disabled' : ''}
            style="width:100%; padding:11px 0; border-radius:14px; font-size:0.9rem; font-weight:700; font-family:inherit; transition:all 0.25s; border:none; letter-spacing:0.02em;
                ${isAvail
                    ? `background:linear-gradient(135deg,${style.border},rgba(226,183,68,0.6)); color:#fff; cursor:pointer;`
                    : `background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.3); cursor:not-allowed;`}">
            ${isAvail ? '<i class="fa-solid fa-hand-holding-heart"></i> Request to Table' : '<i class="fa-solid fa-clock"></i> Unavailable'}
        </button>
    `;
    card.appendChild(body);
    return card;
}

function filterLibraryByGenre(genre, btnEl) {
    libActiveGenre = genre;
    document.querySelectorAll('#libGenrePills .cat-pill').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderLibraryGrid();
}

function filterLibrarySearch(query) {
    libSearchText = query;
    renderLibraryGrid();
}

function openBookRequestModal(bookId) {
    const book = allLibBooks.find(b => b.id === bookId);
    if (!book || book.available_copies < 1) return;
    bookRequestTarget = book;
    const style = getGenreStyle(book.genre);

    document.getElementById('bookRequestBookInfo').innerHTML = `
        <div style="display:flex; gap:14px; align-items:center;">
            <div style="font-size:2.5rem;">&#128218;</div>
            <div>
                <div style="font-weight:800; font-size:1.05rem; color:#fff; margin-bottom:4px;">${book.title}</div>
                <div style="font-size:0.85rem; color:rgba(255,255,255,0.6);">
                    <i class="fa-solid fa-feather-pointed" style="color:${style.text};"></i> ${book.author}
                </div>
                <div style="margin-top:6px; font-size:0.78rem; background:${style.bg}; color:${style.text}; display:inline-block; padding:3px 10px; border-radius:20px; border:1px solid ${style.border};">${book.genre}</div>
            </div>
        </div>`;

    const savedName = document.getElementById('cartCustomerName');
    if (savedName && savedName.value) document.getElementById('bookReqName').value = savedName.value;

    const modal = document.getElementById('bookRequestModal');
    modal.style.display = 'flex';
}

function closeBookRequestModal() {
    document.getElementById('bookRequestModal').style.display = 'none';
    bookRequestTarget = null;
}

async function submitBookRequest() {
    const name = document.getElementById('bookReqName').value.trim();
    const table = document.getElementById('bookReqTable').value;
    const note = document.getElementById('bookReqNote').value.trim();

    if (!name) { showToast('Please enter your name.', 'warning'); return; }
    if (!bookRequestTarget) return;

    try {
        const notes = [table ? `Table: ${table}` : '', note].filter(Boolean).join(' | ') || null;
        const res = await fetch(`${API_BASE}/library/loans`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book_id: bookRequestTarget.id, borrower_name: name, notes })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Request failed');
        }
        closeBookRequestModal();
        showToast(`📚 "${bookRequestTarget.title}" requested! Staff will bring it to you shortly.`, 'success');
        document.getElementById('bookReqName').value = '';
        document.getElementById('bookReqTable').value = '';
        document.getElementById('bookReqNote').value = '';
        await fetchLibraryBooks();
    } catch (e) {
        showToast(e.message || 'Could not send request. Please try again.', 'error');
    }
}

// Initialise library when page loads
document.addEventListener('DOMContentLoaded', fetchLibraryBooks);
