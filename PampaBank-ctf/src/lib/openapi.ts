// OpenAPI 3.0 spec usada pelo Swagger UI em /docs.
// Mantemos como objeto TypeScript para evitar dependência de YAML.

export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "PampaBank CTF API",
    version: "1.0.0",
    description:
      "API fictícia do **PampaBank**, criada para um CTF educacional.\n\n" +
      "⚠️ Ambiente de treino: nada aqui é um banco real.\n\n" +
      "Existe **uma falha proposital** em uma das rotas. Sua missão é encontrá-la usando " +
      "DevTools, Swagger ou Burp Suite e desbloquear a área premium.",
  },
  servers: [{ url: "/", description: "Mesma origem" }],
  tags: [
    { name: "Auth", description: "Login fictício" },
    { name: "Profile", description: "Perfil do cliente" },
    { name: "Flag", description: "Recompensa do desafio" },
    { name: "Audit", description: "Rastros da sessão" },
  ],
  paths: {
    "/api/login": {
      post: {
        tags: ["Auth"],
        summary: "Login do aluno",
        description:
          "Credenciais de demonstração (visíveis de propósito):\n\n" +
          "- `email`: `aluno@pampabank.ctf`\n" +
          "- `password`: `ctf123`",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginInput" },
              example: {
                email: "aluno@pampabank.ctf",
                password: "ctf123",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login realizado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginOutput" },
              },
            },
          },
          "401": { description: "Credenciais inválidas" },
        },
      },
    },
    "/api/profile": {
      get: {
        tags: ["Profile"],
        summary: "Ver perfil do cliente",
        responses: {
          "200": {
            description: "Perfil atual",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Profile" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Profile"],
        summary: "Atualizar perfil",
        description:
          "O frontend envia apenas `{ name }`.\n\n" +
          "**Dica de CTF**: o servidor aceita o body inteiro. O que aconteceria se " +
          "você enviasse outros campos do schema `Profile`?",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Novo Nome" },
                },
              },
              examples: {
                "Atualização normal": {
                  value: { name: "Aluno PampaBank" },
                },
                "Hmm... e se eu enviar isso?": {
                  value: { name: "Aluno PampaBank", isPremium: true },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Perfil atualizado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    user: { $ref: "#/components/schemas/Profile" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/flag": {
      get: {
        tags: ["Flag"],
        summary: "Pegar a flag do desafio",
        description:
          "Só responde 200 se o cliente for premium. Caso contrário, 403.",
        responses: {
          "200": {
            description: "Flag liberada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    flag: { type: "string", example: "CTF{never_trust_the_client}" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "403": { description: "Acesso negado" },
        },
      },
    },
    "/api/audit/me": {
      get: {
        tags: ["Audit"],
        summary: "Rastros da sessão atual",
        description:
          "Retorna os metadados das requisições feitas pelo aluno: método, rota, " +
          "horário, user-agent, idioma, IP aproximado e campos enviados.",
        responses: {
          "200": {
            description: "Resumo de auditoria",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuditSummary" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      LoginOutput: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          token: { type: "string", example: "fake-training-token" },
        },
      },
      Profile: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "Aluno CTF" },
          email: { type: "string", example: "aluno@pampabank.ctf" },
          accountType: { type: "string", enum: ["basic", "premium"] },
          isPremium: { type: "boolean", example: false },
        },
      },
      AuditEvent: {
        type: "object",
        properties: {
          type: { type: "string" },
          method: { type: "string" },
          path: { type: "string" },
          time: { type: "string", format: "date-time" },
          fieldsSent: { type: "array", items: { type: "string" } },
          suspicious: { type: "boolean" },
          note: { type: "string" },
        },
      },
      AuditSummary: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          riskScore: { type: "integer", example: 72 },
          summary: {
            type: "object",
            properties: {
              totalRequests: { type: "integer" },
              suspiciousEvents: { type: "integer" },
              sensitiveFieldsTouched: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
          clientHints: {
            type: "object",
            properties: {
              userAgent: { type: "string" },
              language: { type: "string" },
              ipApprox: { type: "string" },
              referer: { type: "string" },
              origin: { type: "string" },
            },
          },
          events: {
            type: "array",
            items: { $ref: "#/components/schemas/AuditEvent" },
          },
        },
      },
    },
  },
} as const;
