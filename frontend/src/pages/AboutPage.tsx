import { Link } from 'react-router-dom';

const VALUES = [
  {
    number: '01',
    title: 'Qualidade Premium',
    body: 'Cada peça é criteriosamente selecionada entre os melhores fornecedores. Tecidos nobres, acabamentos impecáveis e modelagens que valorizam o corpo.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Estilo Único',
    body: 'Curadoria de peças que transcendem tendências. Apostamos em designs atemporais que revelam a personalidade de quem os veste, coleção após coleção.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Moda com Propósito',
    body: 'Acreditamos que moda é expressão. Por isso valorizamos produções que respeitam quem cria, quem vende e quem usa — do ateliê ao seu guarda-roupa.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
];

const STATS = [
  { value: '+2.000', label: 'Clientes satisfeitos' },
  { value: '+5.000', label: 'Peças entregues' },
  { value: '12', label: 'Coleções lançadas' },
  { value: '100%', label: 'Compra segura' },
];

export function AboutPage() {
  return (
    <main className="about-page">

      {/* ── HERO ── */}
      <section className="about-hero">
        <div className="about-hero-bg" aria-hidden="true">
          <span className="about-hero-ghost">Magic</span>
        </div>
        <div className="about-hero-content">
          <p className="about-eyebrow">Nossa história</p>
          <h1 className="about-headline">
            Moda que <em>encanta.</em><br />
            Estilo que <em>transforma.</em>
          </h1>
          <p className="about-hero-sub">
            A Vista Magic nasceu da crença de que cada pessoa merece
            se vestir com confiança, elegância e autenticidade —
            sem abrir mão da qualidade ou do encanto.
          </p>
        </div>
        <div className="about-hero-scroll" aria-hidden="true">
          <span>Role para descobrir</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </div>
      </section>

      {/* ── MANIFESTO ── */}
      <section className="about-manifesto">
        <div className="about-manifesto-inner">
          <div className="about-manifesto-label">
            <span>Manifesto</span>
            <div className="about-manifesto-line" aria-hidden="true" />
          </div>
          <blockquote className="about-quote">
            "Acreditamos que a moda não é superficial —
            é a linguagem silenciosa com que contamos
            ao mundo quem somos e quem queremos ser."
          </blockquote>
          <p className="about-manifesto-sig">— Vista Magic</p>
        </div>
        <div className="about-manifesto-deco" aria-hidden="true">
          <div className="about-deco-circle" />
          <div className="about-deco-line" />
        </div>
      </section>

      {/* ── STORY ── */}
      <section className="about-story">
        <div className="about-story-text">
          <p className="about-section-label">Quem somos</p>
          <h2 className="about-section-title">
            Uma marca brasileira<br />
            feita com <em>paixão</em>
          </h2>
          <p className="about-body">
            A Vista Magic surgiu com um propósito claro: democratizar o acesso
            à moda de qualidade no Brasil. Fundada por quem vive e respira estilo,
            a marca nasceu da insatisfação com o óbvio e do desejo de oferecer
            algo verdadeiramente especial.
          </p>
          <p className="about-body">
            Nossa curadoria é rigorosa. Cada peça que entra em nosso catálogo
            passa por um processo criterioso de seleção — avaliamos tecido,
            caimento, acabamento e, acima de tudo, se ela tem aquela <em>magia</em>{' '}
            capaz de transformar quem a veste.
          </p>
          <Link to="/" className="about-cta">
            Explorar a coleção
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
        <div className="about-story-visual" aria-hidden="true">
          <div className="about-visual-frame">
            <div className="about-visual-inner">
              <span className="about-visual-text">Vista<br />Magic</span>
              <div className="about-visual-accent" />
            </div>
          </div>
          <div className="about-visual-tag">
            <span>Est. 2024</span>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="about-values">
        <div className="about-values-head">
          <p className="about-section-label">Nossos pilares</p>
          <h2 className="about-section-title">O que nos <em>move</em></h2>
        </div>
        <div className="about-values-grid">
          {VALUES.map((v) => (
            <article key={v.number} className="about-value-card">
              <div className="about-value-top">
                <div className="about-value-icon">{v.icon}</div>
                <span className="about-value-num">{v.number}</span>
              </div>
              <h3 className="about-value-title">{v.title}</h3>
              <p className="about-value-body">{v.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="about-stats">
        <div className="about-stats-inner">
          {STATS.map((s) => (
            <div key={s.label} className="about-stat">
              <span className="about-stat-value">{s.value}</span>
              <span className="about-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTACT CTA ── */}
      <section className="about-contact">
        <div className="about-contact-inner">
          <p className="about-eyebrow">Fale com a gente</p>
          <h2 className="about-contact-title">
            Sua <em>satisfação</em> é<br />nossa prioridade
          </h2>
          <p className="about-contact-sub">
            Tem dúvidas, precisa de ajuda ou quer saber mais sobre alguma peça?
            Nossa equipe está pronta para atendê-lo com toda a atenção que você merece.
          </p>
          <div className="about-contact-actions">
            <a
              href="https://wa.me/5511969707136"
              target="_blank"
              rel="noopener noreferrer"
              className="about-contact-btn about-contact-btn--primary"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.215a.75.75 0 0 0 .916.932l5.453-1.43A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.713 9.713 0 0 1-4.953-1.354l-.355-.211-3.676.964.982-3.585-.232-.37A9.713 9.713 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
              </svg>
              WhatsApp
            </a>
            <a
              href="mailto:contato@vistamagic.com.br"
              className="about-contact-btn about-contact-btn--ghost"
            >
              contato@vistamagic.com.br
            </a>
          </div>
        </div>
        <div className="about-contact-deco" aria-hidden="true">
          <span>magic</span>
        </div>
      </section>

    </main>
  );
}
