function landingForRole(role) {
  switch (role) {
    case "admin":
      return "/admin";
    case "shop_owner":
      return "/owner";
    case "customer":
    default:
      return "/orders";
  }
}
export {
  landingForRole as l
};
