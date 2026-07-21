// Рендер одного блока теории (заголовок + HTML) с двуязычной панелью перевода
// под ним — как blockHTML() в источнике: при lang !== 'en' и наличии перевода
// показываем .gr-block-tr с флагом РУС/ҚАЗ. HTML доверенный (наши же извлечённые
// данные курса), поэтому dangerouslySetInnerHTML.
//
// Эмодзи-иконки блоков (b.ic/b.bg) в источнике есть, но в дизайне их нет —
// заголовок рисуем без цветного чипа (см. отчёт о расхождениях).

export default function RichBlock({ block, tr, lang }) {
  const trPanel = lang !== 'en' && tr && tr[lang] ? tr[lang] : null
  const flag = lang === 'kk' ? 'ҚАЗ' : 'РУС'
  return (
    <div className="gr-block">
      <h2 className="gr-block__h">{block.title}</h2>
      <div className="gr-rich" dangerouslySetInnerHTML={{ __html: block.html }} />
      {trPanel && (
        <div className="gr-block-tr" data-lang={lang}>
          <span className="gr-tr-flag">{flag}</span>
          {trPanel.title && trPanel.title !== block.title && (
            <h3 className="gr-tr-title">{trPanel.title}</h3>
          )}
          <div className="gr-rich" dangerouslySetInnerHTML={{ __html: trPanel.html }} />
        </div>
      )}
    </div>
  )
}
