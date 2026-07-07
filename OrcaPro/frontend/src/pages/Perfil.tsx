import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../services/api";
import { User } from "../types";

const comprimirLogo = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX_W = 600;
      const MAX_H = 200;
      let { width: w, height: h } = img;
      const ratio = Math.min(MAX_W / w, MAX_H / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Erro ao processar imagem"));
    img.src = url;
  });

const comprimirImagem = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 400;
      let { width: w, height: h } = img;
      if (w > h) {
        h = Math.round((h * MAX) / w);
        w = MAX;
      } else {
        w = Math.round((w * MAX) / h);
        h = MAX;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = url;
  });

export default function Perfil() {
  const [user, setUser] = useState<User>({});
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [nomeMarcenaria, setNomeMarcenaria] = useState("");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem("@OrcaPro:user");
      if (stored) return (JSON.parse(stored) as User).logoMarcenaria || null;
    } catch {
      /* */
    }
    return null;
  });
  const [salvandoLogo, setSalvandoLogo] = useState(false);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  useEffect(() => {
    api
      .get("/me")
      .then(({ data }) => {
        setUser(data);
        setNome(data.nome || "");
        setEmail(data.email || "");
        setNomeMarcenaria(data.nomeMarcenaria || "");
        if (data.avatar) setFotoPreview(data.avatar);
        if (data.logoMarcenaria) setLogoPreview(data.logoMarcenaria);
      })
      .catch(() => {
        const userStorage = localStorage.getItem("@OrcaPro:user");
        if (userStorage) {
          const parsed = JSON.parse(userStorage) as User;
          setUser(parsed);
          setNome(parsed.nome || "");
          setEmail(parsed.email || "");
          setNomeMarcenaria(parsed.nomeMarcenaria || "");
          if (parsed.logoMarcenaria) setLogoPreview(parsed.logoMarcenaria);
        }
      });
  }, []);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Escolha uma imagem de até 1MB.");
      return;
    }
    setSalvandoLogo(true);
    try {
      const base64 = await comprimirLogo(file);
      setLogoPreview(base64);
      setUser((prev) => ({ ...prev, logoMarcenaria: base64 }));
      await api.put("/usuarios/perfil", {
        nome,
        email,
        logoMarcenaria: base64,
      });
      const stored = localStorage.getItem("@OrcaPro:user");
      if (stored)
        localStorage.setItem(
          "@OrcaPro:user",
          JSON.stringify({
            ...(JSON.parse(stored) as User),
            logoMarcenaria: base64,
          }),
        );
      setLogoInputKey((k) => k + 1); // reseta o input para aceitar o mesmo arquivo novamente
      toast.success("Logo da marcenaria atualizada!");
    } catch {
      toast.error("Erro ao salvar logo. Tente novamente.");
    } finally {
      setSalvandoLogo(false);
    }
  };

  const handleRemoverLogo = async () => {
    setSalvandoLogo(true);
    try {
      await api.put("/usuarios/perfil", { nome, email, logoMarcenaria: null });
      setLogoPreview(null);
      setUser((prev) => ({ ...prev, logoMarcenaria: null }));
      const stored = localStorage.getItem("@OrcaPro:user");
      if (stored)
        localStorage.setItem(
          "@OrcaPro:user",
          JSON.stringify({
            ...(JSON.parse(stored) as User),
            logoMarcenaria: null,
          }),
        );
      setLogoInputKey((k) => k + 1); // reseta o input para aceitar upload imediatamente
      toast.success("Logo removida. O padrão do OrcaPro será usado.");
    } catch {
      toast.error("Erro ao remover logo.");
    } finally {
      setSalvandoLogo(false);
    }
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Escolha uma foto de até 5MB.");
      return;
    }

    try {
      const base64 = await comprimirImagem(file);
      setFotoPreview(base64);
      await api.put("/usuarios/perfil", { nome, email, avatar: base64 });
      toast.success("Foto de perfil atualizada!");
      const stored = localStorage.getItem("@OrcaPro:user");
      if (stored)
        localStorage.setItem(
          "@OrcaPro:user",
          JSON.stringify({ ...(JSON.parse(stored) as User), avatar: base64 }),
        );
      window.dispatchEvent(
        new CustomEvent("avatarAtualizado", { detail: base64 }),
      );
    } catch {
      toast.error("Erro ao salvar foto. Tente novamente.");
    }
  };

  const handleRemoverFoto = async () => {
    try {
      await api.put("/usuarios/perfil", { nome, email, avatar: null });
      setFotoPreview(null);
      const stored = localStorage.getItem("@OrcaPro:user");
      if (stored)
        localStorage.setItem(
          "@OrcaPro:user",
          JSON.stringify({ ...(JSON.parse(stored) as User), avatar: null }),
        );
      toast.success("Foto removida.");
      window.dispatchEvent(
        new CustomEvent("avatarAtualizado", { detail: null }),
      );
    } catch {
      toast.error("Erro ao remover foto.");
    }
  };

  const handlePerfilSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSalvandoPerfil(true);
    try {
      const response = await api.put("/usuarios/perfil", {
        nome,
        email,
        nomeMarcenaria,
      });
      const updated: User = {
        ...user,
        email: response.data.email,
        nome: response.data.nome,
        nomeMarcenaria: response.data.nomeMarcenaria,
        logoMarcenaria: response.data.logoMarcenaria ?? user.logoMarcenaria,
      };
      setUser(updated);
      setNome(response.data.nome || "");
      setNomeMarcenaria(response.data.nomeMarcenaria || "");
      localStorage.setItem("@OrcaPro:user", JSON.stringify(updated));
      toast.success("Perfil atualizado com sucesso!");
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast.error(
        axiosError.response?.data?.error || "Erro ao atualizar perfil.",
      );
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const handleSenhaSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) {
      toast.error("A nova senha e a confirmação não coincidem.");
      return;
    }
    setSalvandoSenha(true);
    try {
      await api.put("/usuarios/senha", { senhaAtual, novaSenha });
      toast.success("Senha atualizada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast.error(
        axiosError.response?.data?.error ||
          "Erro ao atualizar senha. Verifique sua senha atual.",
      );
    } finally {
      setSalvandoSenha(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: "30px" }}>Meu Perfil</h1>

      <div
        className="grid-responsivo"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            className="cliente-card"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div
              style={{
                width: "130px",
                height: "130px",
                borderRadius: "50%",
                background: "var(--primary)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3.5rem",
                fontWeight: "bold",
                marginBottom: "15px",
                overflow: "hidden",
                border: "4px solid var(--panel-soft)",
                boxShadow: "var(--shadow-soft)",
                position: "relative",
              }}
            >
              {fotoPreview ? (
                <img
                  src={fotoPreview}
                  alt="Perfil"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : user.nome ? (
                user.nome.charAt(0).toUpperCase()
              ) : (
                "U"
              )}
            </div>

            <h2
              style={{
                margin: "0 0 5px 0",
                fontSize: "1.2rem",
                textAlign: "center",
              }}
            >
              {user.nome || user.usuario}
            </h2>
            <p
              style={{
                margin: "0 0 20px 0",
                fontSize: "0.9rem",
                color: "var(--text-soft)",
              }}
            >
              @{user.usuario}
            </p>

            <label
              style={{
                background: "var(--panel-soft)",
                border: "1px solid var(--border)",
                padding: "10px 20px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "bold",
                color: "var(--primary)",
                transition: "0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Trocar Foto
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFotoChange}
              />
            </label>

            {fotoPreview && (
              <button
                type="button"
                onClick={handleRemoverFoto}
                style={{
                  marginTop: "10px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  color: "var(--text-soft)",
                  transition: "0.2s",
                }}
              >
                Remover foto
              </button>
            )}
          </div>

          <div className="cliente-card">
            <h2
              style={{
                borderBottom: "1px solid var(--border)",
                paddingBottom: "12px",
                marginBottom: "20px",
                fontSize: "1.2rem",
              }}
            >
              Dados do Perfil
            </h2>
            <form onSubmit={handlePerfilSubmit}>
              <section
                className="form-section"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  marginBottom: "16px",
                }}
              >
                <label>Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </section>
              <section
                className="form-section"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  marginBottom: "16px",
                }}
              >
                <label>E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-soft)",
                    marginTop: "6px",
                  }}
                >
                  Usado para recuperação de senha. Não será exibido a clientes.
                </p>
              </section>
              <section
                className="form-section"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  marginBottom: "16px",
                }}
              >
                <label>Nome da Marcenaria</label>
                <input
                  type="text"
                  value={nomeMarcenaria}
                  onChange={(e) => setNomeMarcenaria(e.target.value)}
                  placeholder="Ex: Marcenaria Silva"
                />
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-soft)",
                    marginTop: "6px",
                  }}
                >
                  Aparece na mensagem do WhatsApp enviada ao cliente.
                </p>
              </section>
              <button
                type="submit"
                disabled={salvandoPerfil}
                style={{
                  width: "100%",
                  opacity: salvandoPerfil ? 0.7 : 1,
                  cursor: salvandoPerfil ? "not-allowed" : "pointer",
                }}
              >
                {salvandoPerfil ? "Salvando..." : "Salvar Perfil"}
              </button>
            </form>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="cliente-card">
            <h2
              style={{
                borderBottom: "1px solid var(--border)",
                paddingBottom: "12px",
                marginBottom: "20px",
                fontSize: "1.2rem",
              }}
            >
              Logo da Marcenaria
            </h2>
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-soft)",
                marginBottom: "16px",
                lineHeight: "1.5",
              }}
            >
              Aparece nos PDFs e propostas enviadas ao cliente. Tamanho
              recomendado: <strong>600×200px</strong>. Máximo: 1MB. Formatos:
              JPG ou PNG.
            </p>
            <div
              style={{
                background: "var(--panel-soft)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "80px",
              }}
            >
              <img
                src={logoPreview || "/logo-orcapro.png"}
                alt="Logo da marcenaria"
                style={{
                  maxHeight: "80px",
                  maxWidth: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <label
                style={{
                  flex: 1,
                  minWidth: "120px",
                  background: "var(--primary)",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: "6px",
                  cursor: salvandoLogo ? "not-allowed" : "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  textAlign: "center",
                  opacity: salvandoLogo ? 0.7 : 1,
                }}
              >
                {salvandoLogo ? "Salvando..." : "Trocar Logo"}
                <input
                  key={logoInputKey}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handleLogoChange}
                  disabled={salvandoLogo}
                />
              </label>
              {logoPreview && (
                <button
                  type="button"
                  onClick={handleRemoverLogo}
                  disabled={salvandoLogo}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    padding: "10px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    color: "var(--text-soft)",
                  }}
                >
                  Usar padrão OrcaPro
                </button>
              )}
            </div>
          </div>

          <div className="cliente-card">
            <h2
              style={{
                borderBottom: "1px solid var(--border)",
                paddingBottom: "12px",
                marginBottom: "20px",
                fontSize: "1.2rem",
              }}
            >
              Segurança e Senha
            </h2>
            <form onSubmit={handleSenhaSubmit}>
              <section
                className="form-section"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  marginBottom: "15px",
                }}
              >
                <label>Senha Atual</label>
                <input
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  required
                  placeholder="Digite sua senha atual"
                />
              </section>
              <section
                className="form-section"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  marginBottom: "15px",
                }}
              >
                <label>Nova Senha</label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
              </section>
              <section
                className="form-section"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  marginBottom: "25px",
                }}
              >
                <label>Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                  placeholder="Repita a nova senha"
                  minLength={6}
                />
              </section>
              <button
                type="submit"
                disabled={salvandoSenha}
                style={{
                  width: "100%",
                  opacity: salvandoSenha ? 0.7 : 1,
                  cursor: salvandoSenha ? "not-allowed" : "pointer",
                }}
              >
                {salvandoSenha ? "Atualizando Segurança..." : "Atualizar Senha"}
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
}
