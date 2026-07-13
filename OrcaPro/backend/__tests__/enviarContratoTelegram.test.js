const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const {
  criarUsuarioTeste,
  limparUsuarioTeste,
  parseCookies,
} = require("./helpers");

let userA, userB, cookiesA, cookiesB;
let orcamentoIdA;

async function login(usuario) {
  const res = await request(app)
    .post("/api/login")
    .send({ usuario, senha: "senha123" });
  return parseCookies(res);
}

beforeAll(async () => {
  [userA, userB] = await Promise.all([
    criarUsuarioTeste("ctg_a"),
    criarUsuarioTeste("ctg_b"),
  ]);
  [cookiesA, cookiesB] = await Promise.all([
    login(userA.usuario),
    login(userB.usuario),
  ]);

  // Cliente de A sem telegramChatId (nunca conectou o bot)
  const resCliente = await request(app)
    .post("/api/clientes")
    .set("Cookie", cookiesA)
    .send({ nome: "Cliente Sem Telegram", telefone: "11999999999" });

  const resOrcamento = await request(app)
    .post("/api/orcamentos")
    .set("Cookie", cookiesA)
    .send({
      titulo: "Armário de teste Contrato Telegram",
      clienteId: resCliente.body.id,
      tipoMaoDeObra: "Fixo",
      maoDeObraValor: 100,
      tipoLucro: "Fixo",
      lucroValor: 50,
      totalFinal: 150,
    });
  orcamentoIdA = resOrcamento.body.id;
});

afterAll(async () => {
  await Promise.all([
    limparUsuarioTeste(userA.id),
    limparUsuarioTeste(userB.id),
  ]);
  await prisma.$disconnect();
});

describe("POST /api/orcamentos/:id/enviar-contrato-telegram", () => {
  it("exige login (401 sem cookie)", async () => {
    const res = await request(app).post(
      `/api/orcamentos/${orcamentoIdA}/enviar-contrato-telegram`,
    );
    expect(res.status).toBe(401);
  });

  it("cross-tenant: usuário B não envia o contrato de A (404)", async () => {
    const res = await request(app)
      .post(`/api/orcamentos/${orcamentoIdA}/enviar-contrato-telegram`)
      .set("Cookie", cookiesB);
    expect(res.status).toBe(404);
  });

  it("retorna 400 quando o contrato ainda não foi gerado", async () => {
    const res = await request(app)
      .post(`/api/orcamentos/${orcamentoIdA}/enviar-contrato-telegram`)
      .set("Cookie", cookiesA);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/contrato/i);
  });

  it("retorna 400 quando o cliente não conectou o Telegram", async () => {
    await request(app)
      .post(`/api/orcamentos/${orcamentoIdA}/gerar-contrato`)
      .set("Cookie", cookiesA);

    const res = await request(app)
      .post(`/api/orcamentos/${orcamentoIdA}/enviar-contrato-telegram`)
      .set("Cookie", cookiesA);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Telegram/);
  });

  it("orçamento inexistente retorna 404", async () => {
    const res = await request(app)
      .post("/api/orcamentos/999999999/enviar-contrato-telegram")
      .set("Cookie", cookiesA);
    expect(res.status).toBe(404);
  });
});
