import styles from "./RightPanel.module.scss";
import { ScrollArea } from "./ui/ScrollArea";

const referenceSections = [
  {
    title: "Character Classes",
    items: [
      { code: ".", label: "Any character" },
      { code: "\\w", label: "Word character" },
      { code: "\\d", label: "Digit" },
      { code: "\\s", label: "Whitespace" },
      { code: "[abc]", label: "Any of a, b, or c" },
    ],
  },
  {
    title: "Quantifiers",
    items: [
      { code: "*", label: "0 or more" },
      { code: "+", label: "1 or more" },
      { code: "?", label: "0 or 1" },
      { code: "{3}", label: "Exactly 3" },
    ],
  },
  {
    title: "Anchors",
    items: [
      { code: "^", label: "Start of string" },
      { code: "$", label: "End of string" },
      { code: "\\b", label: "Word boundary" },
    ],
  },
];

export function QuickReferenceContent() {
  return (
    <div className={styles.inner}>
      <header className={styles.header}>
        <p className={styles.kicker}>Quick Reference</p>
        <h2 className={styles.title}>Regex Essentials</h2>
      </header>

      {referenceSections.map((section) => (
        <section key={section.title} className={styles.section}>
          <p className={styles.sectionTitle}>{section.title}</p>
          <ul className={styles.list}>
            {section.items.map((item) => (
              <li key={`${section.title}-${item.code}`} className={styles.row}>
                <code className={styles.code}>{item.code}</code>
                <span className={styles.label}>{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function RightPanel() {
  return (
    <aside className={styles.panel}>
      <ScrollArea className={styles.scroll}>
        <QuickReferenceContent />
      </ScrollArea>
    </aside>
  );
}
