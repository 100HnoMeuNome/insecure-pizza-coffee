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
    const cardNumberInput = document.getElementById('cardNumber');
    const cardValidationMessage = document.getElementById('card-validation-message');
    const expiryDateInput = document.getElementById('expiryDate');

    // Card number formatting
    if (cardNumberInput) {
      cardNumberInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\s/g, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        e.target.value = formattedValue;

        // Real-time validation feedback
        if (value.length >= 13) {
          const brand = detectCardBrand(value);
          cardValidationMessage.textContent = `Detected: ${brand}`;
          cardValidationMessage.style.color = '#666';
        } else {
          cardValidationMessage.textContent = '';
        }
      });
    }

    // Expiry date formatting
    if (expiryDateInput) {
      expiryDateInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\//g, '');
        if (value.length >= 2) {
          value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
      });
    }

    // Simple card brand detection (client-side)
    function detectCardBrand(cardNumber) {
      const cleaned = cardNumber.replace(/\s/g, '');
      if (/^5[1-5]/.test(cleaned) || /^2(22[1-9]|2[3-9][0-9]|[3-6][0-9]{2}|7[0-1][0-9]|720)/.test(cleaned)) {
        return 'Mastercard';
      }
      if (/^4/.test(cleaned)) {
        return 'Visa';
      }
      if (/^3[47]/.test(cleaned)) {
        return 'American Express';
      }
      return 'Unknown';
    }

    // Coupon handling
    let appliedCouponCode = null;
    let discountAmount = 0;
    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    const couponCodeInput = document.getElementById('couponCode');
    const couponMessage = document.getElementById('coupon-message');
    const subtotalElement = document.getElementById('subtotal');
    const discountElement = document.getElementById('discount');
    const finalTotalElement = document.getElementById('final-total');
    const discountRow = document.getElementById('discount-row');

    if (applyCouponBtn) {
      applyCouponBtn.addEventListener('click', async function() {
        const couponCode = couponCodeInput.value.trim();

        if (!couponCode) {
          couponMessage.textContent = 'Please enter a coupon code';
          couponMessage.style.color = '#dc3545';
          return;
        }

        applyCouponBtn.disabled = true;
        applyCouponBtn.textContent = 'Validating...';

        try {
          const response = await fetch('/payment/coupon/validate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ couponCode })
          });

          const data = await response.json();

          if (data.success && data.valid) {
            // Calculate discount
            const subtotal = parseFloat(subtotalElement.textContent);
            let discount = 0;

            if (data.type === 'percentage') {
              discount = (subtotal * data.discount) / 100;
            } else {
              discount = data.discount;
            }

            const newTotal = subtotal - discount;

            // Update UI
            discountElement.textContent = discount.toFixed(2);
            finalTotalElement.textContent = newTotal.toFixed(2);
            discountRow.style.display = 'table-row';

            appliedCouponCode = data.code;
            discountAmount = discount;

            couponMessage.textContent = `✓ ${data.description} applied!`;
            couponMessage.style.color = '#28a745';
            couponCodeInput.disabled = true;
            applyCouponBtn.textContent = 'Applied';
          } else {
            couponMessage.textContent = data.message || 'Invalid coupon code';
            couponMessage.style.color = '#dc3545';
            applyCouponBtn.disabled = false;
            applyCouponBtn.textContent = 'Apply';
          }
        } catch (error) {
          console.error('Coupon validation error:', error);
          couponMessage.textContent = 'Error validating coupon';
          couponMessage.style.color = '#dc3545';
          applyCouponBtn.disabled = false;
          applyCouponBtn.textContent = 'Apply';
        }
      });
    }

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
          pixKey: data.pixKey,
          couponCode: appliedCouponCode  // Include applied coupon
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
          let errorMsg = 'Payment failed: ' + paymentResult.error;
          if (paymentResult.reason) {
            errorMsg += '\nReason: ' + paymentResult.reason;
          }
          if (paymentResult.declined) {
            errorMsg += '\n\nPlease try a different card.';
          }
          alert(errorMsg);
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
