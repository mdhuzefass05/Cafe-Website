// public/script.js

const API_BASE = '/api';

// --- AUTHENTICATION ALOGIC ---
if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        emailError.textContent = '';
        passwordError.textContent = '';

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        let isValid = true;
        if (!email) { emailError.textContent = 'Email is required'; isValid = false; }
        if (!password) { passwordError.textContent = 'Password is required'; isValid = false; }

        if (isValid) {
            try {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('isLoggedIn', 'true');
                    const btn = loginForm.querySelector('.btn-primary');
                    btn.innerHTML = `<i class="fa-solid fa-check"></i> Success!`;
                    btn.style.background = 'var(--success)';

                    setTimeout(() => window.location.href = 'dashboard.html', 800);
                } else {
                    passwordError.textContent = data.error || 'Invalid credentials';
                }
            } catch (error) {
                passwordError.textContent = 'Server error. Try again later.';
            }
        }
    });

    // Handle input clears
    emailInput.addEventListener('input', () => emailError.textContent = '');
    passwordInput.addEventListener('input', () => passwordError.textContent = '');
}

// --- DASHBOARD LOGIC ---
if (document.getElementById('logoutBtn')) {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'index.html';
    }

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
        } catch (error) { console.error(error); }
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'index.html';
    });

    // Theme Toggle
    const themeBtn = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
        themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    themeBtn.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-theme');
        if (isDark) {
            document.body.classList.replace('dark-theme', 'light-theme');
            localStorage.setItem('theme', 'light');
            themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        } else {
            document.body.classList.replace('light-theme', 'dark-theme');
            localStorage.setItem('theme', 'dark');
            themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
        updateChartThemes(!isDark);
    });

    // Define Navigation Logic
    const viewSections = document.querySelectorAll('.view-section');
    const navLinks = document.querySelectorAll('.nav-link[data-target]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = document.activeElement === link ? link.dataset.target : e.currentTarget.dataset.target;
            if (!targetId) return;

            // Update UI Sidebar
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            e.currentTarget.parentElement.classList.add('active');

            // Hide all sections then show the target
            viewSections.forEach(sec => sec.style.display = 'none');
            const targetSection = document.getElementById(`view-${targetId}`);
            if (targetSection) {
                targetSection.style.display = 'block';
            }

            // Load data based on view
            if (targetId === 'dashboard') fetchDashboardData();
            if (targetId === 'orders') fetchOrders();
            if (targetId === 'menu') fetchMenu();
            if (targetId === 'inventory') fetchInventory();
        });
    });

    // Chart.js Instances
    let revChart, ordChart, statChart;

    // Polling setup
    fetchDashboardData();
    setInterval(fetchDashboardData, 10000); // Poll every 10 seconds

    async function fetchDashboardData() {
        try {
            const [statsRes, analyticsRes] = await Promise.all([
                fetch(`${API_BASE}/dashboard/stats`),
                fetch(`${API_BASE}/dashboard/analytics`)
            ]);

            if (statsRes.ok) {
                const stats = await statsRes.json();
                document.getElementById('stat-total-orders').textContent = stats.totalOrdersToday || 0;
                document.getElementById('stat-active-orders').textContent = stats.activeOrders || 0;
                document.getElementById('stat-revenue').textContent = `₹${(stats.revenueToday || 0).toFixed(2)}`;
                document.getElementById('stat-reservations').textContent = stats.totalReservations || 0;
            }

            if (analyticsRes.ok) {
                const analytics = await analyticsRes.json();
                updateAIInsights(analytics.insights);
                renderCharts(analytics.charts);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    }

    function updateAIInsights(insights) {
        if (!insights) return;
        document.getElementById('ai-prediction').textContent = insights.predictedTomorrow || 0;
        document.getElementById('ai-peak').textContent = insights.peakHour || 'N/A';
        const growthElem = document.getElementById('ai-growth');
        const growth = Number(insights.revenueGrowth) || 0;
        growthElem.textContent = `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
        growthElem.className = growth >= 0 ? 'gradient-text' : 'text-danger';
        if (growth < 0) growthElem.style.color = 'var(--danger)';

        document.getElementById('ai-rating').textContent = insights.avgRating || 'N/A';
    }

    function renderCharts(chartsData) {
        const isDark = document.body.classList.contains('dark-theme');
        const textColor = isDark ? '#fff' : '#333';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

        Chart.defaults.color = textColor;
        Chart.defaults.font.family = 'Inter';

        const last7DaysTitles = chartsData.last7Days ? chartsData.last7Days.map(d => d.day) : [];
        const revData = chartsData.last7Days ? chartsData.last7Days.map(d => d.revenue) : [];
        const ordData = chartsData.last7Days ? chartsData.last7Days.map(d => d.orders) : [];

        // Revenue Chart (Line)
        const ctxRev = document.getElementById('revenueChart');
        if (revChart) revChart.destroy();
        revChart = new Chart(ctxRev, {
            type: 'line',
            data: {
                labels: last7DaysTitles,
                datasets: [{
                    label: 'Revenue (₹)',
                    data: revData,
                    borderColor: '#D4AF37',
                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: gridColor, display: false } },
                    y: { grid: { color: gridColor }, beginAtZero: true }
                }
            }
        });

        // Orders Chart (Bar)
        const ctxOrd = document.getElementById('ordersChart');
        if (ordChart) ordChart.destroy();
        ordChart = new Chart(ctxOrd, {
            type: 'bar',
            data: {
                labels: last7DaysTitles,
                datasets: [{
                    label: 'Orders',
                    data: ordData,
                    backgroundColor: '#3498db',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: gridColor }, beginAtZero: true }
                }
            }
        });

        // Status Chart (Doughnut)
        const ctxStat = document.getElementById('statusChart');
        if (statChart) statChart.destroy();

        const labels = chartsData.statusDistribution ? chartsData.statusDistribution.map(s => s.status) : [];
        const dataStatus = chartsData.statusDistribution ? chartsData.statusDistribution.map(s => s.count) : [];
        const bgColors = labels.map(l => l === 'pending' ? '#f39c12' : (l === 'completed' ? '#2ecc71' : '#e74c3c'));

        statChart = new Chart(ctxStat, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataStatus,
                    backgroundColor: bgColors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    function updateChartThemes(isDark) {
        if (revChart || ordChart || statChart) fetchDashboardData();
    }

    // --- ORDERS MODAL CRUDS ---
    let currentPage = 1;
    let currentLimit = 10;

    window.openOrdersModal = () => {
        document.getElementById('ordersModal').classList.add('active');
        fetchOrders();
    };

    window.closeOrdersModal = () => {
        document.getElementById('ordersModal').classList.remove('active');
    };

    window.closeOrderFormModal = () => {
        document.getElementById('orderFormModal').classList.remove('active');
    };

    document.getElementById('orderSearch')?.addEventListener('input', (e) => {
        setTimeout(() => { fetchOrders(1, e.target.value); }, 500);
    });

    document.getElementById('statusFilter')?.addEventListener('change', (e) => {
        fetchOrders(1, document.getElementById('orderSearch').value, e.target.value);
    });

    // Fetch Orders
    async function fetchOrders(page = 1, search = '', status = '') {
        try {
            let query = `?page=${page}&limit=${currentLimit}`;
            if (search) query += `&search=${encodeURIComponent(search)}`;
            if (status) query += `&status=${encodeURIComponent(status)}`;

            const res = await fetch(`${API_BASE}/orders${query}`);
            const data = await res.json();

            const tbody = document.getElementById('ordersTableBody');
            tbody.innerHTML = '';

            if (data.data && data.data.length > 0) {
                data.data.forEach(order => {
                    const statusClass = `badge-${order.status}`;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>#${order.id}</td>
                        <td>${order.customer_name || 'Guest'}</td>
                        <td>${order.items}</td>
                        <td>₹${order.total_price.toFixed(2)}</td>
                        <td>
                            <select class="modern-select badge-status ${statusClass}" style="padding: 4px 10px; font-size: 0.8rem; border-color: transparent;" onchange="updateOrderStatus(${order.id}, this, this.value)">
                                <option value="pending" style="background: var(--bg-secondary); color: var(--text-primary);" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="completed" style="background: var(--bg-secondary); color: var(--text-primary);" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="cancelled" style="background: var(--bg-secondary); color: var(--text-primary);" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </td>
                        <td>${new Date(order.created_at).toLocaleString()}</td>
                        <td>
                            <button class="action-btn" onclick="editOrder(${order.id}, '${order.items}', ${order.total_price}, '${order.status}', '${order.notes || ''}', ${order.discount || 0})" title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button class="action-btn" onclick="printOrder(${order.id}, '${order.items}', ${order.total_price}, ${order.discount || 0}, '${order.notes || ''}', '${order.created_at}')" title="Print Receipt"><i class="fa-solid fa-print"></i></button>
                            <button class="action-btn" onclick="deleteOrder(${order.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No orders found.</td></tr>`;
            }

            // Pagination setup
            currentPage = data.page;
            document.getElementById('pageIndicator').textContent = `Page ${data.page}`;
            document.getElementById('prevPage').disabled = data.page <= 1;
            document.getElementById('nextPage').disabled = data.data.length < currentLimit;
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }

    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) fetchOrders(currentPage - 1);
    });
    document.getElementById('nextPage')?.addEventListener('click', () => {
        fetchOrders(currentPage + 1);
    });

    window.updateOrderStatus = async (id, selectElement, newStatus) => {
        try {
            const res = await fetch(`${API_BASE}/orders/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchDashboardData(); // Update charts
                selectElement.className = `modern-select badge-status badge-${newStatus}`;
                // Optional: flash success color or small toast
            } else {
                alert('Failed to update status');
                fetchOrders(currentPage); // Revert dropdown on failure
            }
        } catch (err) {
            console.error(err);
            fetchOrders(currentPage);
        }
    };

    // --- ORDER ITEMS AUTOCOMPLETE LOGIC ---
    let fullMenuCache = [];
    let selectedOrderItemsList = [];

    async function fetchFullMenuForOrders() {
        try {
            const res = await fetch(`${API_BASE}/menu`);
            if (res.ok) {
                const items = await res.json();
                fullMenuCache = items.filter(i => i.is_available === 1);
            }
        } catch (e) { console.error(e); }
    }
    fetchFullMenuForOrders(); // Fetch initially

    const searchInput = document.getElementById('orderItemSearchInput');
    const dropdown = document.getElementById('orderItemDropdown');

    searchInput?.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        dropdown.innerHTML = '';
        if (!val) {
            dropdown.style.display = 'none';
            return;
        }
        const matches = fullMenuCache.filter(item => item.name.toLowerCase().includes(val) || item.category.toLowerCase().includes(val));
        if (matches.length > 0) {
            matches.forEach(match => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.innerHTML = `<span class="dropdown-item-name">${match.name} <small style="color:var(--text-secondary)">(${match.category})</small></span><span class="dropdown-item-price">₹${match.price.toFixed(2)}</span>`;
                div.onclick = () => {
                    addItemToOrder(match);
                    searchInput.value = '';
                    dropdown.style.display = 'none';
                };
                dropdown.appendChild(div);
            });
            dropdown.style.display = 'block';
        } else {
            dropdown.style.display = 'none';
        }
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (searchInput && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    function addItemToOrder(menuItem) {
        const existing = selectedOrderItemsList.find(i => i.name === menuItem.name);
        if (existing) { existing.qty++; }
        else { selectedOrderItemsList.push({ name: menuItem.name, price: menuItem.price, qty: 1 }); }
        refreshSelectedItemsUI();
    }

    window.incrementOrderItem = (index) => { selectedOrderItemsList[index].qty++; refreshSelectedItemsUI(); };
    window.decrementOrderItem = (index) => {
        if (selectedOrderItemsList[index].qty > 1) { selectedOrderItemsList[index].qty--; }
        else { selectedOrderItemsList.splice(index, 1); }
        refreshSelectedItemsUI();
    };
    window.removeOrderItem = (index) => { selectedOrderItemsList.splice(index, 1); refreshSelectedItemsUI(); };

    function refreshSelectedItemsUI() {
        const container = document.getElementById('selectedOrderItems');
        const priceInput = document.getElementById('orderPrice');
        const itemsInput = document.getElementById('orderItems');
        if (!container) return;

        container.innerHTML = '';

        if (selectedOrderItemsList.length === 0) {
            container.innerHTML = `<p id="noItemsText" style="color: var(--text-secondary); margin: 0; font-size: 0.9rem; width: 100%;">No items selected yet.</p>`;
            priceInput.value = '0.00';
            itemsInput.value = '';
            return;
        }

        let total = 0;
        let itemsStringArr = [];
        selectedOrderItemsList.forEach((item, index) => {
            total += (item.price * item.qty);
            itemsStringArr.push(`${item.qty}x ${item.name}`);

            const chip = document.createElement('div');
            chip.className = 'order-item-chip fade-in';
            chip.innerHTML = `
                <span class="chip-name">${item.name}</span>
                <span class="chip-price">₹${(item.price * item.qty).toFixed(2)}</span>
                <div class="chip-controls">
                    <button type="button" class="chip-qty-btn" onclick="decrementOrderItem(${index})"><i class="fa-solid fa-minus"></i></button>
                    <span style="font-weight:bold; font-size:0.9rem;">${item.qty}</span>
                    <button type="button" class="chip-qty-btn" onclick="incrementOrderItem(${index})"><i class="fa-solid fa-plus"></i></button>
                </div>
                <i class="fa-solid fa-xmark chip-remove" onclick="removeOrderItem(${index})"></i>
            `;
            container.appendChild(chip);
        });

        // Apply discount logic
        const discountInput = document.getElementById('orderDiscount');
        const discountVal = discountInput ? parseFloat(discountInput.value) || 0 : 0;
        const discountAmount = total * (discountVal / 100);
        const finalPrice = total - discountAmount;

        priceInput.value = finalPrice.toFixed(2);
        itemsInput.value = itemsStringArr.join(', ');
    }

    // Recalculate if discount changes
    document.getElementById('orderDiscount')?.addEventListener('input', refreshSelectedItemsUI);

    window.showCreateOrderForm = () => {
        document.getElementById('orderFormTitle').innerText = 'Create Order';
        document.getElementById('orderId').value = '';
        document.getElementById('orderNotes').value = '';
        document.getElementById('orderDiscount').value = '0';
        selectedOrderItemsList = [];
        refreshSelectedItemsUI();
        document.getElementById('orderStatus').value = 'pending';
        document.getElementById('orderFormModal').classList.add('active');
        if (fullMenuCache.length === 0) fetchFullMenuForOrders();
    };

    window.editOrder = (id, itemsString, price, status, notes, discount) => {
        document.getElementById('orderFormTitle').innerText = 'Edit Order #' + id;
        document.getElementById('orderId').value = id;
        document.getElementById('orderNotes').value = notes || '';
        document.getElementById('orderDiscount').value = discount || 0;

        selectedOrderItemsList = [];
        if (itemsString) {
            const parts = itemsString.split(', ');
            parts.forEach(part => {
                const match = part.match(/^(\d+)x\s+(.+)$/);
                if (match) {
                    const qty = parseInt(match[1]);
                    const name = match[2];
                    const menuItem = fullMenuCache.find(i => i.name === name);
                    const itemPrice = menuItem ? menuItem.price : 0;
                    selectedOrderItemsList.push({ name, price: itemPrice, qty });
                } else {
                    selectedOrderItemsList.push({ name: part, price: 0, qty: 1 });
                }
            });
        }
        refreshSelectedItemsUI();

        // Override price just in case prices changed
        document.getElementById('orderPrice').value = price.toFixed(2);

        document.getElementById('orderStatus').value = status;
        document.getElementById('orderFormModal').classList.add('active');
        if (fullMenuCache.length === 0) fetchFullMenuForOrders();
    };

    document.getElementById('orderForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('orderId').value;
        const items = document.getElementById('orderItems').value;
        const total_price = parseFloat(document.getElementById('orderPrice').value);
        const status = document.getElementById('orderStatus').value;
        const notes = document.getElementById('orderNotes').value;
        const discount = parseFloat(document.getElementById('orderDiscount').value) || 0;

        const payload = { items, total_price, status, notes, discount };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE}/orders/${id}` : `${API_BASE}/orders`;

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                closeOrderFormModal();
                fetchOrders(currentPage);
                fetchDashboardData();
            } else {
                alert('Save failed');
            }
        } catch (err) { console.error(err); }
    });

    window.deleteOrder = async (id) => {
        if (confirm('Are you sure you want to delete Order #' + id + '?')) {
            try {
                const res = await fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchOrders(currentPage);
                    fetchDashboardData();
                } else {
                    alert('Delete failed');
                }
            } catch (err) { console.error(err); }
        }
    };

    window.printOrder = (id, itemsString, finalTotal, discount, notes, dateString) => {
        document.getElementById('printOrderId').innerText = id;
        document.getElementById('printOrderDate').innerText = new Date(dateString).toLocaleString();

        const itemsListStr = document.getElementById('printOrderItemsList');
        itemsListStr.innerHTML = '';

        if (itemsString) {
            const parts = itemsString.split(', ');
            parts.forEach(part => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.innerHTML = `<span>${part}</span>`;
                itemsListStr.appendChild(row);
            });
        }

        // We deduce subtotal: finalTotal = subtotal * (1 - (discount/100)) => subtotal = finalTotal / (1 - (discount/100))
        let subtotal = finalTotal;
        if (discount > 0) {
            subtotal = finalTotal / (1 - (discount / 100));
        }

        document.getElementById('printOrderSubtotal').innerText = subtotal.toFixed(2);
        document.getElementById('printOrderDiscount').innerText = discount || 0;
        document.getElementById('printOrderTotal').innerText = Number(finalTotal).toFixed(2);

        const notesContainer = document.getElementById('printOrderNotesContainer');
        if (notes && notes.trim() !== '' && notes !== 'null') {
            document.getElementById('printOrderNotes').innerText = notes;
            notesContainer.style.display = 'block';
        } else {
            notesContainer.style.display = 'none';
        }

        // Briefly show the receipt overlay to print it using native window.print() CSS rules
        const receipt = document.getElementById('printReceipt');
        receipt.style.display = 'block';
        setTimeout(() => {
            window.print();
            receipt.style.display = 'none';
        }, 100);
    };

    // Export CSV
    document.getElementById('exportBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.open(`${API_BASE}/orders/export/csv`, '_blank');
    });

    // --- MENU MODAL CRUDS ---
    window.showCreateMenuForm = () => {
        document.getElementById('menuFormTitle').innerText = 'Add Menu Item';
        document.getElementById('menuId').value = '';
        document.getElementById('menuName').value = '';
        document.getElementById('menuCategory').value = '';
        document.getElementById('menuPrice').value = '';
        document.getElementById('menuAvailable').checked = true;
        document.getElementById('menuFormModal').classList.add('active');
    };

    window.closeMenuFormModal = () => {
        document.getElementById('menuFormModal').classList.remove('active');
    };

    window.editMenu = (id, name, cat, price, isAvail) => {
        document.getElementById('menuFormTitle').innerText = 'Edit Menu Item';
        document.getElementById('menuId').value = id;
        document.getElementById('menuName').value = name;
        document.getElementById('menuCategory').value = cat;
        document.getElementById('menuPrice').value = price;
        document.getElementById('menuAvailable').checked = isAvail === 1;
        document.getElementById('menuFormModal').classList.add('active');
    };

    async function fetchMenu() {
        try {
            const res = await fetch(`${API_BASE}/menu`);
            const items = await res.json();
            const tbody = document.getElementById('menuTableBody');
            tbody.innerHTML = '';

            if (items && items.length > 0) {
                items.forEach(item => {
                    const availBadge = item.is_available
                        ? `<span class="badge-status badge-completed">Available</span>`
                        : `<span class="badge-status badge-cancelled">Sold Out</span>`;

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.name}</td>
                        <td>${item.category}</td>
                        <td>₹${item.price.toFixed(2)}</td>
                        <td>${availBadge}</td>
                        <td>
                            <button class="action-btn" onclick="editMenu(${item.id}, '${item.name}', '${item.category}', ${item.price}, ${item.is_available})" title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button class="action-btn" onclick="deleteMenu(${item.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No menu items found.</td></tr>`;
            }
        } catch (error) { console.error('Menu fetch error:', error); }
    }

    document.getElementById('menuForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('menuId').value;
        const payload = {
            name: document.getElementById('menuName').value,
            category: document.getElementById('menuCategory').value,
            price: parseFloat(document.getElementById('menuPrice').value),
            is_available: document.getElementById('menuAvailable').checked ? 1 : 0
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE}/menu/${id}` : `${API_BASE}/menu`;

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                closeMenuFormModal();
                fetchMenu();
            } else { alert('Save failed'); }
        } catch (err) { console.error(err); }
    });

    window.deleteMenu = async (id) => {
        if (confirm('Delete this menu item?')) {
            try {
                const res = await fetch(`${API_BASE}/menu/${id}`, { method: 'DELETE' });
                if (res.ok) fetchMenu();
            } catch (err) { console.error(err); }
        }
    };

    // --- INVENTORY MODAL CRUDS ---
    window.showCreateInventoryForm = () => {
        document.getElementById('inventoryFormTitle').innerText = 'Add Inventory Item';
        document.getElementById('inventoryId').value = '';
        document.getElementById('invName').value = '';
        document.getElementById('invQuantity').value = '';
        document.getElementById('invUnit').value = '';
        document.getElementById('invThreshold').value = '';
        document.getElementById('inventoryFormModal').classList.add('active');
    };

    window.closeInventoryFormModal = () => {
        document.getElementById('inventoryFormModal').classList.remove('active');
    };

    window.editInventory = (id, name, qty, unit, thresh) => {
        document.getElementById('inventoryFormTitle').innerText = 'Edit Inventory';
        document.getElementById('inventoryId').value = id;
        document.getElementById('invName').value = name;
        document.getElementById('invQuantity').value = qty;
        document.getElementById('invUnit').value = unit;
        document.getElementById('invThreshold').value = thresh;
        document.getElementById('inventoryFormModal').classList.add('active');
    };

    async function fetchInventory() {
        try {
            const res = await fetch(`${API_BASE}/inventory`);
            const items = await res.json();
            const tbody = document.getElementById('inventoryTableBody');
            tbody.innerHTML = '';

            if (items && items.length > 0) {
                items.forEach(item => {
                    const isLowStock = item.quantity <= item.low_stock_threshold;
                    const stockBadge = isLowStock
                        ? `<span class="badge-status badge-cancelled">Low Stock</span>`
                        : `<span class="badge-status badge-completed">Healthy</span>`;

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.item_name}</td>
                        <td style="${isLowStock ? 'color: var(--danger); font-weight: bold;' : ''}">${item.quantity}</td>
                        <td>${item.unit}</td>
                        <td>${item.low_stock_threshold}</td>
                        <td>${stockBadge}</td>
                        <td>
                            <button class="action-btn" onclick="editInventory(${item.id}, '${item.item_name}', ${item.quantity}, '${item.unit}', ${item.low_stock_threshold})" title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button class="action-btn" onclick="deleteInventory(${item.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No inventory items found.</td></tr>`;
            }
        } catch (error) { console.error('Inventory fetch error:', error); }
    }

    document.getElementById('inventoryForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('inventoryId').value;
        const payload = {
            item_name: document.getElementById('invName').value,
            quantity: parseFloat(document.getElementById('invQuantity').value),
            unit: document.getElementById('invUnit').value,
            low_stock_threshold: parseFloat(document.getElementById('invThreshold').value)
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE}/inventory/${id}` : `${API_BASE}/inventory`;

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                closeInventoryFormModal();
                fetchInventory();
            } else { alert('Save failed'); }
        } catch (err) { console.error(err); }
    });

    window.deleteInventory = async (id) => {
        if (confirm('Delete this inventory item?')) {
            try {
                const res = await fetch(`${API_BASE}/inventory/${id}`, { method: 'DELETE' });
                if (res.ok) fetchInventory();
            } catch (err) { console.error(err); }
        }
    };
}
