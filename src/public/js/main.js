// Main JavaScript for Insecure Pizza & Coffee

// Add to cart functionality
document.addEventListener('DOMContentLoaded', function() {

  // Add to cart buttons
  const addToCartButtons = document.querySelectorAll('.add-to-cart');
  addToCartButtons.forEach(button => {
    button.addEventListener('click', async function() {
      const productId = this.dataset.id;
      const productName = this.dataset.name;

      try {
        const response = await fetch('/orders/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: productId,
            quantity: 1
          })
        });

        const data = await response.json();

        if (data.success) {
          alert(`${productName} added to cart!`);
        } else {
          alert('Failed to add item to cart');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('An error occurred');
      }
    });
  });

  // Remove from cart buttons
  const removeFromCartButtons = document.querySelectorAll('.remove-from-cart');
  removeFromCartButtons.forEach(button => {
    button.addEventListener('click', async function() {
      const productId = this.dataset.id;

      try {
        const response = await fetch('/orders/cart/remove', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: productId
          })
        });

        const data = await response.json();

        if (data.success) {
          location.reload();
        } else {
          alert('Failed to remove item from cart');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('An error occurred');
      }
    });
  });

  // Checkout form
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    const creditCardFields = document.getElementById('credit-card-fields');
    const pixFields = document.getElementById('pix-fields');
    const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');

    // Toggle payment fields
    paymentMethodRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        if (this.value === 'credit_card') {
          creditCardFields.style.display = 'block';
          pixFields.style.display = 'none';
        } else {
          creditCardFields.style.display = 'none';
          pixFields.style.display = 'block';
        }
      });
    });

    checkoutForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const formData = new FormData(this);
      const data = Object.fromEntries(formData);

      try {
        // Place order first
        const orderResponse = await fetch('/orders/place', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });

        const orderResult = await orderResponse.json();

        if (!orderResult.success) {
          alert('Failed to place order: ' + orderResult.error);
          return;
        }

        // Process payment
        const paymentData = {
          orderId: orderResult.orderId,
          paymentMethod: data.paymentMethod,
          cardNumber: data.cardNumber,
          cardHolder: data.cardHolder,
          expiryDate: data.expiryDate,
          cvv: data.cvv,
          pixKey: data.pixKey
        };

        const paymentResponse = await fetch('/payment/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData)
        });

        const paymentResult = await paymentResponse.json();

        if (paymentResult.success) {
          window.location.href = orderResult.redirectUrl;
        } else {
          alert('Payment failed: ' + paymentResult.error);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during checkout');
      }
    });
  }

  // Admin order status update
  const statusSelects = document.querySelectorAll('.status-select');
  statusSelects.forEach(select => {
    select.addEventListener('change', async function() {
      const orderId = this.dataset.orderId;
      const newStatus = this.value;

      try {
        const response = await fetch('/admin/orders/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: orderId,
            status: newStatus
          })
        });

        const data = await response.json();

        if (data.success) {
          alert('Order status updated successfully');
        } else {
          alert('Failed to update order status');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('An error occurred');
      }
    });
  });

  // Admin system command execution
  const systemCommandForm = document.getElementById('system-command-form');
  if (systemCommandForm) {
    systemCommandForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const command = document.getElementById('command').value;
      const outputBox = document.getElementById('command-output');

      try {
        const response = await fetch('/admin/system/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ command })
        });

        const data = await response.json();

        if (data.success) {
          outputBox.textContent = data.output || 'Command executed successfully';
          if (data.stderr) {
            outputBox.textContent += '\nSTDERR:\n' + data.stderr;
          }
        } else {
          outputBox.textContent = 'Error: ' + (data.error || 'Unknown error');
          if (data.stderr) {
            outputBox.textContent += '\nSTDERR:\n' + data.stderr;
          }
        }
      } catch (error) {
        console.error('Error:', error);
        outputBox.textContent = 'Request failed: ' + error.message;
      }
    });
  }

  // Admin SQL query execution
  const sqlQueryForm = document.getElementById('sql-query-form');
  if (sqlQueryForm) {
    sqlQueryForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const query = document.getElementById('query').value;
      const outputBox = document.getElementById('query-output');

      try {
        const response = await fetch('/admin/database/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query })
        });

        const data = await response.json();

        if (data.success) {
          outputBox.textContent = JSON.stringify(data.results, null, 2);
        } else {
          outputBox.textContent = 'Error: ' + data.error;
        }
      } catch (error) {
        console.error('Error:', error);
        outputBox.textContent = 'Request failed: ' + error.message;
      }
    });
  }
});
