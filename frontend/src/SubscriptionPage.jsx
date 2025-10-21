import React from 'react';

const SubscriptionPage = ({ userId }) => {
  const handleSubscription = async () => {
    const response = await fetch('http://localhost:5000/create-subscription', {
      method: 'POST',
    });
    const subscription = await response.json();

    const options = {
      key: 'YOUR_KEY_ID', // Replace with your Razorpay Key ID
      subscription_id: subscription.id,
      name: 'AI Tally Agent',
      description: 'Subscription',
      handler: async (response) => {
        await fetch('http://localhost:5000/payment-callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
            user_id: userId, // Use the userId prop
          }),
        });
        alert('Payment successful!');
        // You might want to reload the page or update the app state here
        window.location.reload();
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div>
      <h1>Subscription Page</h1>
      <p>You need an active subscription to use the service.</p>
      <button onClick={handleSubscription}>Subscribe Now</button>
    </div>
  );
};

export default SubscriptionPage;
