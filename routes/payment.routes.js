const express = require("express");
const router = express.Router();
const payOS = require("../utils/payos.util");
const Payment = require("../models/Payment");

// Utility function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1. Tạo đơn thanh toán
router.post("/create", async (req, res) => {
  const { description, returnUrl, cancelUrl, amount, userId, movieId } = req.body;

  console.log("Request Body:", req.body);
  console.log("PayOS Credentials:", {
    clientId: process.env.PAYOS_CLIENT_ID ? "Configured" : "Missing",
    apiKey: process.env.PAYOS_API_KEY ? "Configured" : "Missing",
    checksumKey: process.env.PAYOS_CHECKSUM_KEY ? "Configured" : "Missing"
  });

  const orderCode = Number(String(Date.now()).slice(-6));

  const body = {
    orderCode,
    amount,
    description: description || "Ma giao dich thu nghiem",
    returnUrl: returnUrl || process.env.PAYOS_RETURN_URL,
    cancelUrl: cancelUrl || process.env.PAYOS_CANCEL_URL,
    items: [
      {
        name: "Ma giao dich thu nghiem",
        quantity: 1,
        price: amount
      }
    ]
  };

  console.log("PayOS Request Body:", body);

  try {
    // Add delay before making the request
    await delay(1000);
    
    const paymentLinkRes = await payOS.createPaymentLink(body);
    console.log("PayOS Response:", paymentLinkRes);

    // Lưu thông tin thanh toán vào database
    const payment = new Payment({
      orderCode,
      amount,
      description: description || "Ma giao dich thu nghiem",
      userId,
      movieId,
      payosData: {
        bin: paymentLinkRes.bin,
        checkoutUrl: paymentLinkRes.checkoutUrl,
        accountNumber: paymentLinkRes.accountNumber,
        accountName: paymentLinkRes.accountName,
        qrCode: paymentLinkRes.qrCode
      }
    });

    await payment.save();

    return res.json({
      error: 0,
      message: "Success",
      data: {
        bin: paymentLinkRes.bin,
        checkoutUrl: paymentLinkRes.checkoutUrl,
        accountNumber: paymentLinkRes.accountNumber,
        accountName: paymentLinkRes.accountName,
        amount: paymentLinkRes.amount,
        description: paymentLinkRes.description,
        orderCode: paymentLinkRes.orderCode,
        qrCode: paymentLinkRes.qrCode,
      },
    });
  } catch (error) {
    console.error("Lỗi tạo đơn chi tiết:", {
      message: error.message,
      stack: error.stack,
      body: body,
      statusCode: error.response?.status
    });

    // Handle rate limit error
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: -1,
        message: "Vui lòng thử lại sau ít phút (rate limit exceeded)",
        data: null
      });
    }

    return res.status(500).json({
      error: -1,
      message: "Tạo đơn thất bại: " + error.message,
      data: null,
    });
  }
});

// 2. Truy vấn đơn hàng
router.get("/:orderId", async (req, res) => {
  try {
    // Tìm trong database local trước
    const localPayment = await Payment.findOne({ orderCode: req.params.orderId })
      .populate('userId', 'name email') // Lấy thông tin user
      .populate('movieId', 'title price'); // Lấy thông tin movie

    if (!localPayment) {
      return res.status(404).json({
        error: -1,
        message: "Không tìm thấy đơn hàng",
        data: null,
      });
    }

    // Kiểm tra trạng thái từ PayOS nếu đơn chưa hoàn thành
    if (localPayment.status === 'PENDING') {
      try {
        const payosOrder = await payOS.getPaymentLinkInfomation(req.params.orderId);
        // Cập nhật thông tin mới nhất từ PayOS
        if (payosOrder) {
          localPayment.status = payosOrder.status === 'PAID' ? 'SUCCESS' : 'PENDING';
          if (payosOrder.status === 'PAID') {
            localPayment.paymentTime = new Date();
            localPayment.paymentMethod = payosOrder.paymentMethod;
          }
          await localPayment.save();
        }
      } catch (payosError) {
        console.error("Lỗi khi kiểm tra PayOS:", payosError);
        // Vẫn trả về thông tin local nếu không check được PayOS
      }
    }

    return res.json({
      error: 0,
      message: "Thành công",
      data: localPayment
    });
  } catch (error) {
    console.error("Lỗi truy vấn đơn:", error);
    return res.status(500).json({
      error: -1,
      message: "Lỗi hệ thống",
      data: null,
    });
  }
});

// 3. Hủy đơn thanh toán
router.put("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancellationReason } = req.body;

    const order = await payOS.cancelPaymentLink(orderId, cancellationReason);
    return res.json({
      error: 0,
      message: "Đã hủy thành công",
      data: order,
    });
  } catch (error) {
    console.error("Lỗi hủy đơn:", error);
    return res.status(500).json({
      error: -1,
      message: "Hủy đơn thất bại",
      data: null,
    });
  }
});

// 4. Xác nhận webhook
router.post("/confirm-webhook", async (req, res) => {
  const { webhookUrl } = req.body;
  try {
    await payOS.confirmWebhook(webhookUrl);
    return res.json({
      error: 0,
      message: "Đã xác nhận webhook",
    });
  } catch (error) {
    console.error("Lỗi xác nhận webhook:", error);
    return res.status(500).json({
      error: -1,
      message: "Xác nhận thất bại",
    });
  }
});

// 5. Nhận webhook thanh toán
router.post("/webhook", async (req, res) => {
  try {
    const webhookData = payOS.verifyPaymentWebhookData(req.body);
    console.log("📥 Webhook nhận được:", webhookData);

    // TODO: xử lý logic lưu đơn/ cập nhật DB ở đây
    return res.json({
      error: 0,
      message: "Webhook received",
      data: webhookData,
    });
  } catch (error) {
    console.error("Lỗi webhook:", error);
    return res.status(400).json({
      error: -1,
      message: "Webhook không hợp lệ",
    });
  }
});

// Route handler cho payment success
router.get("/success", async (req, res) => {
  try {
    const { orderCode, amount, description, status } = req.query;
    console.log("Payment Success Callback:", { orderCode, amount, description, status });
    
    // Cập nhật trạng thái thanh toán trong database
    const payment = await Payment.findOne({ orderCode });
    if (payment) {
      payment.status = 'SUCCESS';
      payment.paymentTime = new Date();
      await payment.save();
    }
    
    return res.json({
      error: 0,
      message: "Thanh toán thành công",
      data: { orderCode, amount, description, status }
    });
  } catch (error) {
    console.error("Lỗi xử lý payment success:", error);
    return res.status(500).json({
      error: -1,
      message: "Lỗi xử lý payment success",
      data: null
    });
  }
});

// Route handler cho payment cancel
router.get("/cancel", async (req, res) => {
  try {
    const { orderCode } = req.query;
    console.log("Payment Cancelled:", { orderCode });
    
    // Cập nhật trạng thái đơn hàng trong database
    const payment = await Payment.findOne({ orderCode });
    if (payment) {
      payment.status = 'CANCELLED';
      await payment.save();
    }
    
    return res.json({
      error: 0,
      message: "Đã hủy thanh toán",
      data: { orderCode }
    });
  } catch (error) {
    console.error("Lỗi xử lý payment cancel:", error);
    return res.status(500).json({
      error: -1,
      message: "Lỗi xử lý payment cancel",
      data: null
    });
  }
});

module.exports = router;
