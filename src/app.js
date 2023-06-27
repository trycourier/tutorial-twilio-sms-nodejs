const express = require('express');
const { CourierClient } = require("@trycourier/courier");
require('dotenv').config();


const app = express();
app.use(express.json());

const courier = CourierClient({ authorizationToken: process.env.COURIER_AUTH_TOKEN });

app.get('/', (req, res) => {
  res.send('Welcome to the Bookstore App!');
});

app.post('/orders', async (req, res) => {
  const { customerName, customerPhoneNumber, orderNumber } = req.body;

  if (!customerName || !customerPhoneNumber || !orderNumber) {
    return res.status(400).json({ error: 'Missing required field' });
  }

  try {
    // simulate creating a new order
    console.log(`Creating order ${orderNumber} for ${customerName}`);

    // send order confirmation SMS
    const messageId = await sendOrderConfirmationSMS(customerName, customerPhoneNumber, orderNumber);

    res.status(200).json({ message: 'Order created successfully', messageId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

async function sendOrderConfirmationSMS(customerName, customerPhoneNumber, orderNumber) {
  const { messageId } = await courier.send({
    eventId: "order_confirmation",
    recipientId: customerPhoneNumber,
    profile: {
      phone_number: customerPhoneNumber
    },
    data: {
      customerName,
      orderNumber
    }
  });

  return messageId;
}

app.post("/send-sms-multiple", async (req, res) => {
  const recipients = req.body.recipients;
  const toRecipients = [];

  for (const recipient of recipients) {
    await courier.profiles.replace(recipient.id, { phone_number: recipient.phoneNumber });
    toRecipients.push({ user_id: recipient.id, phone_number: recipient.phoneNumber, data: { name: recipient.name } });
  }

  const { requestId } = await courier.send({
    message: {
      to: toRecipients,
      content: {
        title: "Delivery Updates",
        body: "Hello {{name}}, your package with tracking number {{tracking_number}} has been dispatched by {{courier}}.",
      },
      routing: {
        method: "all",
        channels: ["sms"],
      },
    },
    data: {
      tracking_number: "1234567890",
      courier: "Fast Delivery",
    },
  });

  res.json({ messageId: requestId });
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));