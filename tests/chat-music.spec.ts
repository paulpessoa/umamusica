import { test, expect } from "@playwright/test";

test("deve completar o fluxo completo de criacao de musica, chat e checkout simulado", async ({ page }) => {
  // Capturar erros do console e exceções não tratadas da página
  page.on("pageerror", (exception) => {
    console.error(`[PAGE ERROR] Uncaught exception: "${exception.message}"\nStack:\n${exception.stack}`);
  });

  page.on("console", (msg) => {
    console.log(`[PAGE CONSOLE] [${msg.type()}]: ${msg.text()}`);
  });

  // 1. Configurar mocks de API para reproduzir o ciclo de vida real
  let orderStatus = "pending";

  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        text: "Que história linda! Para quem é essa música e qual é o estilo que você prefere (ex: Sertanejo, Samba, MPB)?"
      }
    });
  });

  await page.route("**/api/checkout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        orderId: "test_order_123",
        paymentQr: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=mock-pix-test_order_123",
        paymentCopiaCola: "00020126580014br.gov.bcb.pix0136unamusica-pay-mock-test_order_123"
      }
    });
  });

  await page.route("**/api/orders/test_order_123/simulate-payment", async (route) => {
    orderStatus = "paid";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: { status: "ok" }
    });
  });

  await page.route("**/api/orders/test_order_123/generate", async (route) => {
    orderStatus = "completed";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: { status: "ok" }
    });
  });

  await page.route("**/api/orders/test_order_123", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        id: "test_order_123",
        email: "paul@example.com",
        status: orderStatus,
        prompt: "Música de aniversário",
        style: "Samba",
        lyrics: "Parabéns pra você, nesta data querida...",
        audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        video_url: orderStatus === "completed" ? "https://www.w3schools.com/html/mov_bbb.mp4" : null,
        song_metadata: orderStatus === "completed" ? {
          title: "Samba do Carlos",
          lyrics: "Carlos faz 60 anos, churrasco e pescaria, a família toda junta na maior alegria...",
          style: "Samba",
          tempo: "Alegre",
          vibe: "Festa",
          artistName: "Compositor IA",
          keyMemories: ["churrasco", "pescar"],
          dedicatedTo: "Carlos"
        } : null
      }
    });
  });

  // 2. Navegar para a página inicial
  await page.goto("/");
  await expect(page).toHaveTitle(/UmaMusica/i);

  // 3. Preencher e-mail e iniciar criação
  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill("paul@example.com");

  const startButton = page.locator('button:has-text("Criar Música Agora")');
  await startButton.click();

  // 4. Fluxo de Chat (conversação de 3 mensagens para habilitar a composição)
  const chatInput = page.locator('input[placeholder="Converse com a IA Compositora..."]');

  // Enviar Mensagem 1
  await expect(page.locator("text=Vou te ajudar a transformar sua história")).toBeVisible();
  await chatInput.fill("É para o aniversário de 60 anos do meu pai Carlos.");
  await chatInput.press("Enter");

  // Enviar Mensagem 2
  await chatInput.fill("Ele ama churrasco, pescar e a família reunida.");
  await chatInput.press("Enter");

  // Enviar Mensagem 3
  await chatInput.fill("Gostaria de um estilo Samba bem alegre.");
  await chatInput.press("Enter");

  // 5. Concluir e ir para o Checkout
  const composeButton = page.locator('button:has-text("Concluir e Compor Música")');
  await expect(composeButton).toBeVisible();
  await composeButton.click();

  // 6. Verificar a tela de checkout e simular pagamento Pix
  await expect(page.locator("text=Quase lá! Componha por R$ 1,00")).toBeVisible();

  const simulatePaymentButton = page.locator('button:has-text("Simular Pagamento Pix")');
  await expect(simulatePaymentButton).toBeVisible();
  await simulatePaymentButton.click();

  // 7. Verificar a tela de sucesso
  await expect(page.locator("text=produzida com sucesso")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("text=Carlos").first()).toBeVisible();
});
