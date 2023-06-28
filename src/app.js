const express = require("express");
const { CourierClient } = require("@trycourier/courier");
require("dotenv").config();

const app = express();
app.use(express.json());

const courier = CourierClient({
  authorizationToken: process.env.COURIER_AUTH_TOKEN,
});

app.get("/", (req, res) => {
  res.send("Welcome to the Bookstore App!");
});

app.post("/orders", async (req, res) => {
  const { customerName, customerPhoneNumber, orderNumber } = req.body;

  if (!customerName || !customerPhoneNumber || !orderNumber) {
    return res.status(400).json({ error: "Missing required field" });
  }

  try {
    // simulate creating a new order
    console.log(`Creating order ${orderNumber} for ${customerName}`);

    // send order confirmation SMS
    const requestId = await sendOrderConfirmationSMS(
      customerName,
      customerPhoneNumber,
      orderNumber
    );

    res
      .status(200)
      .json({ message: "Order created successfully", request_id: requestId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

async function sendOrderConfirmationSMS(
  customerName,
  customerPhoneNumber,
  orderNumber
) {
  const { requestId } = await courier.send({
    message: {
      to: {
        phone_number: customerPhoneNumber,
        data: {
          order_id: orderNumber,
          customer_name: customerName,
        },
      },
      content: {
        title: "Confirm your order",
        body: `Hello {{customer_name}}, 
        We have placed your order, {{order_id}}
        `,
      },
      routing: {
        method: "single",
        channels: ["sms"],
      },
    },
  });

  return requestId;
}

app.post("/send-sms-multiple", async (req, res) => {
  const recipients = req.body.recipients;
  const toRecipients = [];

  for (const recipient of recipients) {
    try {
      let d = await courier.replaceProfile({
        recipientId: recipient.id,
        profile: {
          phone_number: recipient.phoneNumber,
        },
      });  
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create/update profile" });
    }

    toRecipients.push({
      user_id: recipient.id,
      phone_number: recipient.phoneNumber,
      data: {
        name: recipient.name,
        tracking_number: recipient.trackingNumber,
        courier: recipient.courier,
      },
    });
  }

  try {
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
    });
  
    res.json({ request_id: requestId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send SMS" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
