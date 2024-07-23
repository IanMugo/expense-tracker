document.addEventListener('DOMContentLoaded', () => {
    const baseUrl = 'http://localhost:3000';
    let token = localStorage.getItem('token') || '';
  
    function handleResponse(response) {
      if (!response.ok) {
        return response.json().then(err => { throw new Error(err.message); });
      }
      return response.json();
    }
  
    function showMessage(message) {
      alert(message);
    }
  
    // Registration form
    if (document.getElementById('registerForm')) {
      const registerForm = document.getElementById('registerForm');
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;
  
        try {
          const response = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const data = await handleResponse(response);
          showMessage('Registration successful!');
          window.location.href = 'login.html';
        } catch (err) {
          showMessage(err.message);
        }
      });
    }
  
    // Login form
    if (document.getElementById('loginForm')) {
      const loginForm = document.getElementById('loginForm');
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;
  
        try {
          const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
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
  
    // Add expense form
    if (document.getElementById('expenseForm')) {
      const expenseForm = document.getElementById('expenseForm');
      expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const description = e.target.description.value;
        const amount = parseFloat(e.target.amount.value);
        const date = e.target.date.value;
  
        try {
          const response = await fetch(`${baseUrl}/api/expenses`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ description, amount, date })
          });
          const data = await handleResponse(response);
          showMessage('Expense added successfully!');
          window.location.href = 'view_expense.html';
        } catch (err) {
          showMessage(err.message);
        }
      });
    }
  
    // Edit expense form
    if (document.getElementById('editExpenseForm')) {
      const editExpenseForm = document.getElementById('editExpenseForm');
      const expenseId = new URLSearchParams(window.location.search).get('id');
      
      fetch(`${baseUrl}/api/expenses/${expenseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(handleResponse)
      .then(expense => {
        editExpenseForm.description.value = expense.description;
        editExpenseForm.amount.value = expense.amount;
        editExpenseForm.date.value = new Date(expense.date).toISOString().substring(0, 10);
      })
      .catch(err => showMessage(err.message));
  
      editExpenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const description = e.target.description.value;
        const amount = parseFloat(e.target.amount.value);
        const date = e.target.date.value;
  
        try {
          const response = await fetch(`${baseUrl}/api/expenses/${expenseId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ description, amount, date })
          });
          const data = await handleResponse(response);
          showMessage('Expense updated successfully!');
          window.location.href = 'view_expense.html';
        } catch (err) {
          showMessage(err.message);
        }
      });
    }
  
    // View expenses
    if (document.getElementById('expenseList')) {
      const expenseList = document.getElementById('expenseList');
      const totalExpense = document.getElementById('totalExpense');
  
      async function loadExpenses() {
        try {
          const response = await fetch(`${baseUrl}/api/expenses`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await handleResponse(response);
          expenseList.innerHTML = '';
          data.forEach(expense => {
            const li = document.createElement('li');
            li.textContent = `${expense.description} - $${expense.amount} on ${new Date(expense.date).toLocaleDateString()}`;
            expenseList.appendChild(li);
  
            // Add edit and delete buttons
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => {
              window.location.href = `edit_expense.html?id=${expense.id}`;
            };
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
          });
  
          // Calculate total expense
          const totalResponse = await fetch(`${baseUrl}/api/expense`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const totalData = await handleResponse(totalResponse);
          totalExpense.textContent = `Total Expense: $${totalData.totalExpense}`;
        } catch (err) {
          showMessage(err.message);
        }
      }
  
      loadExpenses();
    }
  });
  