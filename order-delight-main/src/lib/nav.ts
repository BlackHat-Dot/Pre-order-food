import type { Role } from "./api";

export function landingForRole(role: Role | null): string {
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
