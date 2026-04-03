import notifier from "node-notifier";

type NotificationType =
  | "NEW_ORDER"
  | "ORDER_CANCEL"
  | "ORDER_REPLACE"
  | "FILL_OPEN"
  | "FILL_CLOSE";

let init = false;
export const notify = (type: NotificationType, message: string) => {
  let title = "";

  switch (type) {
    case "NEW_ORDER":
      title = "🆕 New Order";
      break;
    case "ORDER_CANCEL":
      title = "❌ Order Cancelled";
      break;
    case "ORDER_REPLACE":
      title = "🔁 Order Updated";
      break;
    case "FILL_OPEN":
      title = "📈 Position Opened";
      break;
    case "FILL_CLOSE":
      title = "💰 Trade Closed";
      break;
  }

  notifier.notify({
    title,
    message,
    sound: true,
    wait: false,
  });
};
