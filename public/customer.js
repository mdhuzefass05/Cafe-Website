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
    resultDiv.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin"></i> Checking order status...</div>`;

    try {
        const res = await fetch(`${API_BASE}/orders/${orderId}`);
        if (res.status === 404) {
            resultDiv.innerHTML = `
                <div style="text-align: center; padding: 25px; color: var(--danger);">
                    <i class="fa-solid fa-circle-xmark" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Order #${orderId} not found. Please verify your order number.</p>
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
                            <h3 style="margin: 0;">Order #${order.id}</h3>
                            <span style="color: var(--text-secondary); font-size: 0.9rem;">Customer: ${order.customer_name || 'Guest'}</span>
                        </div>
                        <span style="background: rgba(231,76,60,0.2); color: var(--danger); padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 0.9rem;">Cancelled</span>
                    </div>
                    <p style="color: var(--text-secondary); font-size: 0.95rem;">This order was cancelled by the store. Please contact staff for details.</p>
                </div>
            `;
            return;
        }

        resultDiv.innerHTML = `
            <div class="order-status-card fade-in">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.25rem;">Order #${order.id}</h3>
                        <span style="color: var(--text-secondary); font-size: 0.9rem;">Customer: <strong>${order.customer_name || 'Guest'}</strong></span>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: var(--gold-primary); font-weight: 700; font-size: 1.2rem;">₹${order.total_price.toFixed(2)}</span>
                    </div>
                </div>

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

                <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px; margin-top: 15px;">
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;">Order Summary:</div>
                    <div style="color: white; font-weight: 500;">${order.items}</div>
                    ${order.notes ? `<div style="font-size: 0.85rem; color: var(--gold-primary); margin-top: 6px;"><i class="fa-solid fa-pen"></i> Notes: ${order.notes}</div>` : ''}
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        resultDiv.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 20px;">Failed to query order details.</div>`;
    }
};

// --- FORMS LOGIC ---
function setupForms() {
    // Reservation Form
    document.getElementById('customerReservationForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

        const payload = {
            customer_name: document.getElementById('resName').value,
            contact_info: document.getElementById('resContact').value,
            guests: parseInt(document.getElementById('resGuests').value, 10),
            reservation_time: document.getElementById('resTime').value,
            special_requests: document.getElementById('resRequests').value
        };

        try {
            const res = await fetch(`${API_BASE}/reservations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast("Table booking request sent! We look forward to welcoming you.", "fa-calendar-check");
                e.target.reset();
            } else {
                showToast("Error submitting table reservation.", "fa-circle-xmark");
            }
        } catch (err) {
            console.error(err);
            showToast("Network error submitting reservation.", "fa-wifi");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-calendar-plus" style="margin-right:8px;"></i> Confirm Booking Request';
        }
    });

    // Feedback Form
    document.getElementById('customerFeedbackForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

        const payload = {
            customer_name: document.getElementById('fbName').value.trim() || 'Anonymous Coffee Lover',
            rating: parseInt(document.getElementById('fbRating').value, 10),
            message: document.getElementById('fbMessage').value.trim()
        };

        try {
            const res = await fetch(`${API_BASE}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast("Thank you for your valuable feedback!", "fa-heart");
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
            btn.innerHTML = '<i class="fa-solid fa-paper-plane" style="margin-right:8px;"></i> Submit Review';
        }
    });
}

// --- FEEDBACK WALL ---
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
        wall.innerHTML = `<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">Be the first to leave a review!</p>`;
        return;
    }

    recentReviews.forEach(r => {
        const card = document.createElement('div');
        card.className = 'feedback-card fade-in';
        const starsHtml = '⭐'.repeat(r.rating || 5);
        card.innerHTML = `
            <div class="stars">${starsHtml}</div>
            <p style="color: white; font-size: 0.95rem; font-style: italic; margin-bottom: 12px; line-height: 1.5;">"${r.message}"</p>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--gold-primary);">
                <strong>- ${r.customer_name || 'Anonymous'}</strong>
                <span style="color: var(--text-secondary);">${new Date(r.created_at || Date.now()).toLocaleDateString()}</span>
            </div>
        `;
        wall.appendChild(card);
    });
}
