document.addEventListener('DOMContentLoaded', () => {
    const baseUrl = 'http://localhost:3000';
    let token = localStorage.getItem('token') || '';

    const handleResponse = async (response) => {
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const err = await response.json();
                throw new Error(err.message);
            } else {
                const err = await response.text();
                throw new Error(err);
            }
        }
        return response.json();
    };

    const showMessage = (message) => alert(message);

    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const expenseForm = document.getElementById('expenseForm');
    const editExpenseForm = document.getElementById('editExpenseForm');
    const expenseList = document.getElementById('expenseList');
    const totalExpense = document.getElementById('totalExpense');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = e.target.elements['username'].value;
            const email = e.target.elements['email'].value;
            const password = e.target.elements['password'].value;
            const confirmpassword = e.target.elements['confirmpassword'].value;

            console.log({ username, email, password, confirmpassword }); // Corrected logging

            try {
                const response = await fetch(`${baseUrl}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, confirmpassword })
                });
                await handleResponse(response);
                showMessage('Registration successful!');
                window.location.href = 'login.html';
            } catch (err) {
                showMessage(err.message);
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = e.target.elements['username'].value; // Changed from email to username
            const password = e.target.elements['password'].value;

            console.log({ username, password }); // Corrected logging

            try {
                const response = await fetch(`${baseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }) // Sending username instead of email
                });
                const data = await handleResponse(response);
                token = data.token;
                localStorage.setItem('token', token);
                showMessage('Login successful!');
                window.location.href = 'index.html';
            } catch (err) {
                showMessage(err.message);
            }
        });
    }
});

    if (expenseForm) {
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const expense_name = e.target.elements['expense_name'];
            const amount = e.target.elements['amount'];
            const date = e.target.elements['date'];
            const category = e.target.elements['category'];

            console.log({ expense_name, amount, date, category }); // Debugging line

            try {
                const response = await fetch(`${baseUrl}/api/expenses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ expense_name: expense_name.value, amount: parseFloat(amount.value), date: date.value, category: category.value })
                });
                await handleResponse(response);
                showMessage('Expense added successfully!');
                window.location.href = 'view_expense.html';
            } catch (err) {
                showMessage(err.message);
            }
        });
    }

    if (editExpenseForm) {
        const expenseId = new URLSearchParams(window.location.search).get('id');

        const fetchExpense = async () => {
            try {
                const response = await fetch(`${baseUrl}/api/expenses/${expenseId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const expense = await handleResponse(response);
                editExpenseForm.elements['expense_name'].value = expense.expense_name;
                editExpenseForm.elements['amount'].value = expense.amount;
                editExpenseForm.elements['date'].value = new Date(expense.date).toISOString().substring(0, 10);
                editExpenseForm.elements['category'].value = expense.category;
            } catch (err) {
                showMessage(err.message);
            }
        };

        fetchExpense();

        editExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const expense_name = e.target.elements['expense_name'];
            const amount = e.target.elements['amount'];
            const date = e.target.elements['date'];
            const category = e.target.elements['category'];

            console.log({ expense_name, amount, date, category }); // Debugging line

            try {
                const response = await fetch(`${baseUrl}/api/expenses/${expenseId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ expense_name: expense_name.value, amount: parseFloat(amount.value), date: date.value, category: category.value })
                });
                await handleResponse(response);
                showMessage('Expense updated successfully!');
                window.location.href = 'view_expense.html';
            } catch (err) {
                showMessage(err.message);
            }
        });
    }

    if (expenseList) {
        const loadExpenses = async () => {
            try {
                const response = await fetch(`${baseUrl}/api/expenses`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const expenses = await handleResponse(response);
                expenseList.innerHTML = '';

                expenses.forEach(expense => {
                    const li = document.createElement('li');
                    li.textContent = `${expense.expense_name} - $${expense.amount} on ${new Date(expense.date).toLocaleDateString()}`;

                    const editBtn = document.createElement('button');
                    editBtn.textContent = 'Edit';
                    editBtn.onclick = () => window.location.href = `edit_expense.html?id=${expense.id}`;
                    li.appendChild(editBtn);

                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Delete';
                    deleteBtn.onclick = async () => {
                        if (confirm('Are you sure you want to delete this expense?')) {
                            try {
                                const response = await fetch(`${baseUrl}/api/expenses/${expense.id}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                await handleResponse(response);
                                showMessage('Expense deleted successfully!');
                                loadExpenses();
                            } catch (err) {
                                showMessage(err.message);
                            }
                        }
                    };
                    li.appendChild(deleteBtn);

                    expenseList.appendChild(li);
                });

                const totalResponse = await fetch(`${baseUrl}/api/expense`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const totalData = await handleResponse(totalResponse);
                totalExpense.textContent = `Total Expense: $${totalData.totalExpense}`;
            } catch (err) {
                showMessage(err.message);
            }
        };

        loadExpenses();
    };
