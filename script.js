
// String variable
let myString = "javascript";

// Number variable
let myNumber =40;

// Boolean variable
let myBoolean = true;

//addition

function addition(a, b){
    return a + b;
}
console.log(addition(100, 200));

//subtraction

function subtraction(a, b){
    return a - b;
}
console.log(subtraction(100, 200));

//multiplication

function multiplication(a, b){
    return a * b;
}
console.log(multiplication(100, 200));

//division

function division(a, b){
    return a / b;
}
console.log(division(100, 200));


    // edit the button  
    document.addEventListener('DOMContentLoaded'), () => {
    // Get the button, input field, and display text elements
    const submitButton = document.getElementById('submitButton');
    const toggleButton = document.getElementById('toggleButton');
    const userInput = document.getElementById('userInput');
    const displayText = document.getElementById('displayText');}
    
    // Event listener for the submit button
    submitButton.addEventListener('click', () => {
        // Get the value from the input field
        const inputText = userInput.value;
        
        // Display the user's input in the paragraph and change its style
        displayText.textContent = inputText;
        displayText.style.color = 'blue';
        displayText.style.fontWeight = 'bold';
    });
    
    // Event listener for the toggle button
    toggleButton.addEventListener('click', () => {
        // Toggle the visibility of the display text
        if (displayText.style.display === 'none') {
            displayText.style.display = 'block';
        } else {
            displayText.style.display = 'none';
        }
    });

    // Event listener for the input field to handle real-time updates
    userInput.addEventListener('input', () => {
        // Display the real-time input in the paragraph
        displayText.textContent = userInput.value;
    });

    // Create a chart using Chart.js
    const ctx = document.getElementById('myChart').getContext('2d');
    const myChart = new Chart(ctx, {
        type: 'bar', // Change this to 'line', 'pie', etc. for different chart types
        data: {
            labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
            datasets: [{
                label: '# of Votes',
                data: [12, 19, 3, 5, 2, 3],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

