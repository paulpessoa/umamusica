import { test, expect } from "@playwright/test";

const BASE_URL = "https://umamusica.vercel.app";

const MOCK_USER = {
  id: "test-user-id-123",
  email: "teste@playwright.com",
  name: "Teste Playwright",
  referral_code: "PLAYWRIGHT1",
  free_songs_balance: 3,
  session_token: "mock-session-token-playwright",
};

test.describe("Login Flow - umamusica.vercel.app", () => {
  test("deve exibir tela de email e enviar codigo com sucesso", async ({ page }) => {
    await page.route("**/api/send-otp", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", json: { success: true } });
    });

    await page.goto(BASE_URL + "/login");

    await expect(page.getByRole("heading", { name: "Qual seu e-mail?" })).toBeVisible();
    await expect(page.locator("input[type=email]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Receber Codigo" })).toBeVisible();

    await page.locator("input[type=email]").fill("teste@playwright.com");
    await page.getByRole("button", { name: "Receber Codigo" }).click();

    await expect(page.getByRole("heading", { name: "Insira o codigo" })).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=teste@playwright.com")).toBeVisible();

    const otpInputs = page.locator("input[inputmode=numeric]");
    await expect(otpInputs).toHaveCount(6);
  });

  test("deve completar o login com OTP mockado e redirecionar para menu", async ({ page }) => {
    await page.route("**/api/send-otp", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", json: { success: true } });
    });

    await page.route("**/api/verify-otp", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      if (body.email === "teste@playwright.com" && body.code && body.code.length === 6) {
        await route.fulfill({ status: 200, contentType: "application/json", json: { user: MOCK_USER } });
      } else {
        await route.fulfill({ status: 400, contentType: "application/json", json: { error: "Codigo invalido" } });
      }
    });

    await page.goto(BASE_URL + "/login");
    await page.locator("input[type=email]").fill("teste@playwright.com");
    await page.getByRole("button", { name: "Receber Codigo" }).click();

    await expect(page.getByRole("heading", { name: "Insira o codigo" })).toBeVisible({ timeout: 8000 });

    const otpInputs = page.locator("input[inputmode=numeric]");
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(String(i + 1));
    }

    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/menu/, { timeout: 10000 });
  });

  test("deve exibir erro ao inserir OTP invalido", async ({ page }) => {
    await page.route("**/api/send-otp", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", json: { success: true } });
    });
    await page.route("**/api/verify-otp", async (route) => {
      await route.fulfill({ status: 400, contentType: "application/json", json: { error: "Codigo invalido ou expirado" } });
    });

    await page.goto(BASE_URL + "/login");
    await page.locator("input[type=email]").fill("teste@playwright.com");
    await page.getByRole("button", { name: "Receber Codigo" }).click();

    await expect(page.getByRole("heading", { name: "Insira o codigo" })).toBeVisible({ timeout: 8000 });

    const otpInputs = page.locator("input[inputmode=numeric]");
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill("9");
    }
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.locator("text=Codigo invalido ou expirado")).toBeVisible({ timeout: 8000 });
  });
});