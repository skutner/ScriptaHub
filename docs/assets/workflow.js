(() => {
  "use strict";

  const collection = globalThis.SCRIPTA_COLLECTION;
  const root = document.querySelector("[data-workflow-content]");
  if (!collection || !root) return;

  const text = {
    en: {
      createKicker: "Create with the community", createTitle: "Propose a book worth making.", createLead: "Share source material and a precise brief for a niche book, manual, tutorial or demanding long-form work. The form prepares an email for the ScriptaHub editorial team.",
      name: "Your name", email: "Reply email", url: "Website you would like to promote", files: "Source documents", filesNote: "Select the documents here, then attach them manually when your email application opens; browsers cannot add mail attachments automatically.", prompt: "Instructions for the book", promptHint: "Audience, purpose, scope, structure, viewpoints to include, quality criteria…", titles: "Proposed titles", titlesHint: "One or several possible titles", propose: "Propose book", mailNote: "Submitting opens your email application with a structured message addressed to create@scriptahub.com.", mailReady: "Your email application should open now. Remember to attach the selected documents.", createSubject: "ScriptaHub book proposal",
      contractTitle: "Contribution agreement", contractIntro: "Before proposing a book, you agree to these submission terms:", contractItems: ["You own the intellectual-property rights in everything you submit, have permission to submit it, or it is public-domain or compatibly licensed material.", "You give ScriptaHub a worldwide, non-exclusive permission to review, store, edit, translate, combine and adapt the submission to evaluate and create book editions.", "Any part incorporated into a published edition may be released under Creative Commons Attribution 4.0 (CC BY 4.0), which permits sharing and adaptation, including commercially, with attribution.", "You will not submit confidential, unlawfully obtained, privacy-violating or infringing material. You remain responsible for the submission and keep ownership of your original material."], contractAccept: "I have read and accept this contribution agreement.", contractLink: "Read the CC BY 4.0 licence summary",
      feedbackKicker: "Improve this edition", feedbackTitle: "Suggest a valuable change.", feedbackLead: "Point to a stylistic, editorial, factual or conceptual improvement. Be specific enough that editors can evaluate and incorporate it.", promise: "Suggestions considered valuable by AI-assisted checks and human reviewers can be incorporated into the next edition. Material contributors may be credited in the book; acceptance and credit are editorial decisions, not automatic promises.", kind: "Type of contribution", kinds: ["Editorial structure", "Writing style", "Factual correction", "Argument or viewpoint", "Accessibility", "Other"], feedback: "Your proposed change or feedback", feedbackHint: "Quote or identify the passage when possible, explain the issue and propose a better version.", sources: "Sources or supporting context", sourcesHint: "Links, citations, examples or reasoning", send: "Send feedback", feedbackSubject: "ScriptaHub edition feedback", missingBook: "The book context is missing or invalid. Open this page from a book page so the proposal can be linked to the correct edition.",
      editionsKicker: "Publication history", editionsTitle: "Editions", editionsLead: "Publication dates, change logs and durable PDF downloads for every published edition.", current: "Current", published: "Published", changes: "What changed", download: "Download PDF", back: "View Book", noPdf: "No PDF was published for this edition.", loadError: "The edition history could not be loaded.",
    },
    fr: {
      createKicker: "Créer avec la communauté", createTitle: "Proposez un livre qui mérite d’exister.", createLead: "Partagez des sources et un cahier des charges précis pour un livre de niche, un manuel, un tutoriel ou un texte long exigeant. Le formulaire prépare un courriel pour l’équipe éditoriale de ScriptaHub.",
      name: "Votre nom", email: "Adresse de réponse", url: "Site que vous souhaitez promouvoir", files: "Documents sources", filesNote: "Sélectionnez les documents ici, puis joignez-les manuellement lorsque votre messagerie s’ouvre ; un navigateur ne peut pas ajouter automatiquement des pièces jointes.", prompt: "Instructions pour le livre", promptHint: "Public, objectif, périmètre, structure, points de vue, critères de qualité…", titles: "Titres proposés", titlesHint: "Un ou plusieurs titres possibles", propose: "Proposer le livre", mailNote: "L’envoi ouvre votre messagerie avec un message structuré adressé à create@scriptahub.com.", mailReady: "Votre messagerie devrait s’ouvrir. Pensez à joindre les documents sélectionnés.", createSubject: "Proposition de livre ScriptaHub",
      contractTitle: "Accord de contribution", contractIntro: "Avant de proposer un livre, vous acceptez les conditions suivantes :", contractItems: ["Vous détenez les droits de propriété intellectuelle sur tout élément envoyé, avez l’autorisation de l’envoyer, ou il appartient au domaine public ou dispose d’une licence compatible.", "Vous accordez à ScriptaHub une autorisation mondiale et non exclusive d’examiner, conserver, modifier, traduire, combiner et adapter l’envoi afin d’évaluer et de créer des éditions.", "Toute partie intégrée à une édition publiée pourra être diffusée sous licence Creative Commons Attribution 4.0 (CC BY 4.0), qui autorise partage et adaptation, y compris commerciale, avec attribution.", "Vous n’enverrez aucun contenu confidentiel, obtenu illégalement, portant atteinte à la vie privée ou aux droits d’autrui. Vous restez responsable de l’envoi et propriétaire de votre contenu original."], contractAccept: "J’ai lu et j’accepte cet accord de contribution.", contractLink: "Lire le résumé de la licence CC BY 4.0",
      feedbackKicker: "Améliorer cette édition", feedbackTitle: "Proposez une modification utile.", feedbackLead: "Signalez une amélioration stylistique, éditoriale, factuelle ou conceptuelle, assez précise pour être évaluée et intégrée.", promise: "Les suggestions jugées utiles par les vérifications assistées par IA et les relecteurs humains pourront entrer dans la prochaine édition. Les contributions substantielles peuvent être créditées ; acceptation et crédit relèvent du choix éditorial.", kind: "Type de contribution", kinds: ["Structure éditoriale", "Style d’écriture", "Correction factuelle", "Argument ou point de vue", "Accessibilité", "Autre"], feedback: "Modification ou retour proposé", feedbackHint: "Citez ou localisez le passage, expliquez le problème et proposez une meilleure version.", sources: "Sources ou contexte", sourcesHint: "Liens, références, exemples ou raisonnement", send: "Envoyer le retour", feedbackSubject: "Retour sur une édition ScriptaHub", missingBook: "Le contexte du livre manque ou n’est pas valide. Ouvrez cette page depuis une page de livre.",
      editionsKicker: "Historique de publication", editionsTitle: "Éditions", editionsLead: "Dates, journaux des modifications et PDF durables de chaque édition publiée.", current: "Actuelle", published: "Publiée le", changes: "Modifications", download: "Télécharger le PDF", back: "Voir le livre", noPdf: "Aucun PDF n’a été publié pour cette édition.", loadError: "Impossible de charger l’historique des éditions.",
    },
    de: {
      createKicker: "Mit der Gemeinschaft erstellen", createTitle: "Ein Buch vorschlagen, das sich lohnt.", createLead: "Teilen Sie Quellen und ein präzises Briefing für ein Nischenbuch, Handbuch, Tutorial oder anspruchsvolles Langformat. Das Formular bereitet eine E-Mail an das ScriptaHub-Redaktionsteam vor.",
      name: "Ihr Name", email: "Antwortadresse", url: "Website, die Sie bewerben möchten", files: "Quelldokumente", filesNote: "Wählen Sie die Dokumente hier aus und hängen Sie sie nach dem Öffnen des E-Mail-Programms manuell an; Browser dürfen Anhänge nicht automatisch hinzufügen.", prompt: "Anweisungen für das Buch", promptHint: "Zielgruppe, Zweck, Umfang, Struktur, Perspektiven, Qualitätskriterien…", titles: "Titelvorschläge", titlesHint: "Ein oder mehrere mögliche Titel", propose: "Buch vorschlagen", mailNote: "Beim Absenden öffnet sich Ihr E-Mail-Programm mit einer strukturierten Nachricht an create@scriptahub.com.", mailReady: "Ihr E-Mail-Programm sollte sich öffnen. Bitte hängen Sie die ausgewählten Dokumente an.", createSubject: "ScriptaHub-Buchvorschlag",
      contractTitle: "Vereinbarung für Beiträge", contractIntro: "Bevor Sie ein Buch vorschlagen, stimmen Sie diesen Bedingungen zu:", contractItems: ["Sie besitzen die Rechte an allem Eingereichten, dürfen es einreichen oder das Material ist gemeinfrei beziehungsweise kompatibel lizenziert.", "Sie erteilen ScriptaHub eine weltweite, nicht ausschließliche Erlaubnis, die Einreichung zur Prüfung und Erstellung von Buchausgaben zu prüfen, zu speichern, zu bearbeiten, zu übersetzen, zu kombinieren und anzupassen.", "Jeder in eine veröffentlichte Ausgabe übernommene Teil darf unter Creative Commons Namensnennung 4.0 (CC BY 4.0) erscheinen; dies erlaubt Teilen und Bearbeiten, auch kommerziell, bei Namensnennung.", "Sie reichen keine vertraulichen, rechtswidrig beschafften, persönlichkeits- oder rechtsverletzenden Inhalte ein. Sie bleiben verantwortlich und behalten das Eigentum an Ihrem Originalmaterial."], contractAccept: "Ich habe diese Vereinbarung gelesen und akzeptiere sie.", contractLink: "Zusammenfassung von CC BY 4.0 lesen",
      feedbackKicker: "Diese Ausgabe verbessern", feedbackTitle: "Eine wertvolle Änderung vorschlagen.", feedbackLead: "Beschreiben Sie eine stilistische, redaktionelle, sachliche oder konzeptionelle Verbesserung so genau, dass sie geprüft und eingearbeitet werden kann.", promise: "Vorschläge, die KI-gestützte Prüfungen und menschliche Gutachter für wertvoll halten, können in die nächste Ausgabe einfließen. Wesentliche Mitwirkende können genannt werden; Annahme und Nennung sind redaktionelle Entscheidungen.", kind: "Art des Beitrags", kinds: ["Redaktionelle Struktur", "Schreibstil", "Sachliche Korrektur", "Argument oder Perspektive", "Barrierefreiheit", "Sonstiges"], feedback: "Vorgeschlagene Änderung oder Rückmeldung", feedbackHint: "Nennen Sie möglichst die Stelle, erklären Sie das Problem und schlagen Sie eine bessere Fassung vor.", sources: "Quellen oder Kontext", sourcesHint: "Links, Zitate, Beispiele oder Begründung", send: "Feedback senden", feedbackSubject: "Feedback zu einer ScriptaHub-Ausgabe", missingBook: "Der Buchkontext fehlt oder ist ungültig. Öffnen Sie diese Seite von einer Buchseite aus.",
      editionsKicker: "Publikationsverlauf", editionsTitle: "Ausgaben", editionsLead: "Daten, Änderungsprotokolle und dauerhafte PDF-Downloads aller veröffentlichten Ausgaben.", current: "Aktuell", published: "Veröffentlicht", changes: "Änderungen", download: "PDF herunterladen", back: "Buch ansehen", noPdf: "Für diese Ausgabe wurde kein PDF veröffentlicht.", loadError: "Der Ausgabenverlauf konnte nicht geladen werden.",
    },
    es: {
      createKicker: "Crear con la comunidad", createTitle: "Propón un libro que merezca existir.", createLead: "Comparte fuentes y unas instrucciones precisas para un libro de nicho, manual, tutorial u obra extensa y exigente. El formulario prepara un correo para el equipo editorial de ScriptaHub.",
      name: "Tu nombre", email: "Correo de respuesta", url: "Sitio web que quieres promocionar", files: "Documentos fuente", filesNote: "Selecciona aquí los documentos y adjúntalos manualmente cuando se abra tu aplicación de correo; el navegador no puede añadir adjuntos automáticamente.", prompt: "Instrucciones para el libro", promptHint: "Público, objetivo, alcance, estructura, perspectivas, criterios de calidad…", titles: "Títulos propuestos", titlesHint: "Uno o varios títulos posibles", propose: "Proponer libro", mailNote: "Al enviar se abre tu correo con un mensaje estructurado a create@scriptahub.com.", mailReady: "Tu aplicación de correo debería abrirse. Recuerda adjuntar los documentos seleccionados.", createSubject: "Propuesta de libro para ScriptaHub",
      contractTitle: "Acuerdo de contribución", contractIntro: "Antes de proponer un libro, aceptas estas condiciones:", contractItems: ["Posees los derechos de propiedad intelectual de todo lo enviado, tienes permiso para enviarlo o es material de dominio público o con licencia compatible.", "Concedes a ScriptaHub un permiso mundial y no exclusivo para revisar, almacenar, editar, traducir, combinar y adaptar el envío con el fin de evaluarlo y crear ediciones.", "Cualquier parte incorporada a una edición publicada podrá difundirse bajo Creative Commons Atribución 4.0 (CC BY 4.0), que permite compartir y adaptar, incluso comercialmente, con atribución.", "No enviarás material confidencial, obtenido ilegalmente, que vulnere la privacidad o infrinja derechos. Sigues siendo responsable y conservas la propiedad de tu material original."], contractAccept: "He leído y acepto este acuerdo de contribución.", contractLink: "Leer el resumen de CC BY 4.0",
      feedbackKicker: "Mejorar esta edición", feedbackTitle: "Propón un cambio valioso.", feedbackLead: "Señala una mejora de estilo, editorial, factual o conceptual con suficiente precisión para evaluarla e incorporarla.", promise: "Las sugerencias que las comprobaciones asistidas por IA y los revisores humanos consideren valiosas podrán incorporarse a la próxima edición. Las contribuciones sustanciales pueden acreditarse; aceptación y crédito son decisiones editoriales.", kind: "Tipo de contribución", kinds: ["Estructura editorial", "Estilo de escritura", "Corrección factual", "Argumento o perspectiva", "Accesibilidad", "Otro"], feedback: "Cambio o comentario propuesto", feedbackHint: "Identifica el pasaje, explica el problema y propone una versión mejor cuando sea posible.", sources: "Fuentes o contexto", sourcesHint: "Enlaces, citas, ejemplos o razonamiento", send: "Enviar comentarios", feedbackSubject: "Comentarios sobre una edición de ScriptaHub", missingBook: "Falta el contexto del libro o no es válido. Abre esta página desde la página de un libro.",
      editionsKicker: "Historial de publicación", editionsTitle: "Ediciones", editionsLead: "Fechas, registros de cambios y descargas PDF duraderas de cada edición publicada.", current: "Actual", published: "Publicada", changes: "Cambios", download: "Descargar PDF", back: "Ver libro", noPdf: "No se publicó un PDF para esta edición.", loadError: "No se pudo cargar el historial de ediciones.",
    },
    pt: {
      createKicker: "Criar com a comunidade", createTitle: "Proponha um livro que valha a pena.", createLead: "Partilhe fontes e instruções precisas para um livro de nicho, manual, tutorial ou obra longa exigente. O formulário prepara um e-mail para a equipa editorial do ScriptaHub.",
      name: "Seu nome", email: "E-mail para resposta", url: "Site que deseja promover", files: "Documentos de origem", filesNote: "Selecione os documentos aqui e anexe-os manualmente quando o e-mail abrir; o navegador não pode adicionar anexos automaticamente.", prompt: "Instruções para o livro", promptHint: "Público, objetivo, escopo, estrutura, perspectivas, critérios de qualidade…", titles: "Títulos propostos", titlesHint: "Um ou vários títulos possíveis", propose: "Propor livro", mailNote: "O envio abre seu aplicativo de e-mail com uma mensagem estruturada para create@scriptahub.com.", mailReady: "Seu aplicativo de e-mail deve abrir agora. Lembre-se de anexar os documentos selecionados.", createSubject: "Proposta de livro ScriptaHub",
      contractTitle: "Acordo de contribuição", contractIntro: "Antes de propor um livro, você aceita estas condições:", contractItems: ["Você possui os direitos de propriedade intelectual de tudo o que envia, tem permissão para enviar ou o material é de domínio público ou tem licença compatível.", "Você concede ao ScriptaHub uma permissão mundial e não exclusiva para revisar, armazenar, editar, traduzir, combinar e adaptar o envio a fim de avaliá-lo e criar edições.", "Qualquer parte incorporada a uma edição publicada poderá ser lançada sob Creative Commons Atribuição 4.0 (CC BY 4.0), que permite partilha e adaptação, inclusive comercial, com atribuição.", "Você não enviará material confidencial, obtido ilegalmente, que viole privacidade ou direitos. Continua responsável e mantém a propriedade do material original."], contractAccept: "Li e aceito este acordo de contribuição.", contractLink: "Ler o resumo da CC BY 4.0",
      feedbackKicker: "Melhorar esta edição", feedbackTitle: "Sugira uma mudança valiosa.", feedbackLead: "Indique uma melhoria de estilo, editorial, factual ou conceitual com precisão suficiente para ser avaliada e incorporada.", promise: "Sugestões consideradas valiosas por verificações assistidas por IA e revisores humanos podem entrar na próxima edição. Contribuições substanciais podem receber crédito; aceitação e crédito são decisões editoriais.", kind: "Tipo de contribuição", kinds: ["Estrutura editorial", "Estilo de escrita", "Correção factual", "Argumento ou perspectiva", "Acessibilidade", "Outro"], feedback: "Mudança ou feedback proposto", feedbackHint: "Identifique a passagem, explique o problema e proponha uma versão melhor quando possível.", sources: "Fontes ou contexto", sourcesHint: "Links, citações, exemplos ou raciocínio", send: "Enviar feedback", feedbackSubject: "Feedback sobre edição ScriptaHub", missingBook: "O contexto do livro está ausente ou é inválido. Abra esta página a partir de uma página de livro.",
      editionsKicker: "Histórico de publicação", editionsTitle: "Edições", editionsLead: "Datas, registros de alterações e PDFs duradouros de todas as edições publicadas.", current: "Atual", published: "Publicada", changes: "Alterações", download: "Baixar PDF", back: "Ver livro", noPdf: "Nenhum PDF foi publicado para esta edição.", loadError: "Não foi possível carregar o histórico de edições.",
    },
    it: {
      createKicker: "Creare con la comunità", createTitle: "Proponi un libro che valga la pena creare.", createLead: "Condividi fonti e istruzioni precise per un libro di nicchia, manuale, tutorial o opera lunga e impegnativa. Il modulo prepara un’email per la redazione di ScriptaHub.",
      name: "Il tuo nome", email: "Email per la risposta", url: "Sito che vuoi promuovere", files: "Documenti sorgente", filesNote: "Seleziona qui i documenti e allegali manualmente quando si apre l’app di posta; il browser non può aggiungere allegati automaticamente.", prompt: "Istruzioni per il libro", promptHint: "Pubblico, obiettivo, ambito, struttura, punti di vista, criteri di qualità…", titles: "Titoli proposti", titlesHint: "Uno o più titoli possibili", propose: "Proponi il libro", mailNote: "L’invio apre l’app di posta con un messaggio strutturato a create@scriptahub.com.", mailReady: "L’app di posta dovrebbe aprirsi. Ricorda di allegare i documenti selezionati.", createSubject: "Proposta di libro ScriptaHub",
      contractTitle: "Accordo di contribuzione", contractIntro: "Prima di proporre un libro, accetti queste condizioni:", contractItems: ["Possiedi i diritti di proprietà intellettuale su tutto ciò che invii, hai il permesso di inviarlo oppure il materiale è di pubblico dominio o con licenza compatibile.", "Concedi a ScriptaHub un permesso mondiale e non esclusivo per esaminare, conservare, modificare, tradurre, combinare e adattare l’invio al fine di valutarlo e creare edizioni.", "Ogni parte incorporata in un’edizione pubblicata potrà essere distribuita con licenza Creative Commons Attribuzione 4.0 (CC BY 4.0), che consente condivisione e adattamento, anche commerciale, con attribuzione.", "Non invierai materiali riservati, ottenuti illegalmente, lesivi della privacy o dei diritti altrui. Resti responsabile e conservi la proprietà del materiale originale."], contractAccept: "Ho letto e accetto questo accordo di contribuzione.", contractLink: "Leggi il riepilogo della CC BY 4.0",
      feedbackKicker: "Migliora questa edizione", feedbackTitle: "Proponi una modifica utile.", feedbackLead: "Indica un miglioramento stilistico, editoriale, fattuale o concettuale con precisione sufficiente per valutarlo e integrarlo.", promise: "I suggerimenti ritenuti validi dai controlli assistiti dall’IA e dai revisori umani potranno entrare nella prossima edizione. I contributi sostanziali possono essere accreditati; accettazione e credito sono decisioni editoriali.", kind: "Tipo di contributo", kinds: ["Struttura editoriale", "Stile di scrittura", "Correzione fattuale", "Argomento o punto di vista", "Accessibilità", "Altro"], feedback: "Modifica o feedback proposto", feedbackHint: "Individua il passaggio, spiega il problema e proponi una versione migliore quando possibile.", sources: "Fonti o contesto", sourcesHint: "Link, citazioni, esempi o ragionamento", send: "Invia feedback", feedbackSubject: "Feedback su un’edizione ScriptaHub", missingBook: "Il contesto del libro manca o non è valido. Apri questa pagina dalla pagina di un libro.",
      editionsKicker: "Cronologia di pubblicazione", editionsTitle: "Edizioni", editionsLead: "Date, registri delle modifiche e PDF permanenti di ogni edizione pubblicata.", current: "Attuale", published: "Pubblicata", changes: "Modifiche", download: "Scarica PDF", back: "Vedi il libro", noPdf: "Nessun PDF è stato pubblicato per questa edizione.", loadError: "Impossibile caricare la cronologia delle edizioni.",
    },
    ro: {
      createKicker: "Creează împreună cu comunitatea", createTitle: "Propune o carte care merită creată.", createLead: "Trimite documente-sursă și indicații precise pentru o carte de nișă, un manual, un tutorial sau o lucrare amplă și exigentă. Formularul pregătește un e-mail pentru echipa editorială ScriptaHub.",
      name: "Numele tău", email: "E-mail pentru răspuns", url: "Site-ul pe care vrei să îl promovezi", files: "Documente-sursă", filesNote: "Selectează documentele aici, apoi atașează-le manual când se deschide aplicația de e-mail; browserul nu poate adăuga automat atașamente.", prompt: "Indicații pentru carte", promptHint: "Public, scop, domeniu, structură, perspective de inclus, criterii de calitate…", titles: "Titluri propuse", titlesHint: "Unul sau mai multe titluri posibile", propose: "Propune cartea", mailNote: "Trimiterea deschide aplicația ta de e-mail cu un mesaj structurat către create@scriptahub.com.", mailReady: "Aplicația de e-mail ar trebui să se deschidă acum. Nu uita să atașezi documentele selectate.", createSubject: "Propunere de carte ScriptaHub",
      contractTitle: "Acord de contribuție", contractIntro: "Înainte să propui o carte, accepți următoarele condiții:", contractItems: ["Deții drepturile de proprietate intelectuală pentru tot ce trimiți, ai permisiunea de a trimite materialul sau acesta este în domeniul public ori are o licență compatibilă.", "Acorzi ScriptaHub o permisiune neexclusivă, valabilă la nivel mondial, de a analiza, stoca, edita, traduce, combina și adapta contribuția pentru evaluare și crearea edițiilor.", "Orice parte încorporată într-o ediție publicată poate fi distribuită sub Creative Commons Atribuire 4.0 (CC BY 4.0), licență care permite distribuirea și adaptarea, inclusiv comercială, cu atribuire.", "Nu vei trimite materiale confidențiale, obținute ilegal, care încalcă viața privată sau drepturile altora. Rămâi responsabil pentru contribuție și păstrezi proprietatea materialului original."], contractAccept: "Am citit și accept acest acord de contribuție.", contractLink: "Citește rezumatul licenței CC BY 4.0",
      feedbackKicker: "Îmbunătățește ediția", feedbackTitle: "Propune o modificare valoroasă.", feedbackLead: "Semnalează o îmbunătățire de stil, editorială, factuală sau conceptuală suficient de precisă pentru a putea fi evaluată și încorporată.", promise: "Sugestiile considerate valoroase de verificările asistate de AI și de reviewerii umani pot fi încorporate în ediția următoare. Contribuitorii substanțiali pot fi menționați; acceptarea și creditarea sunt decizii editoriale, nu promisiuni automate.", kind: "Tipul contribuției", kinds: ["Structură editorială", "Stil de scriere", "Corecție factuală", "Argument sau perspectivă", "Accesibilitate", "Altceva"], feedback: "Modificarea sau feedbackul propus", feedbackHint: "Indică pasajul când este posibil, explică problema și propune o versiune mai bună.", sources: "Surse sau context ajutător", sourcesHint: "Linkuri, citări, exemple sau argumente", send: "Trimite feedbackul", feedbackSubject: "Feedback pentru o ediție ScriptaHub", missingBook: "Contextul cărții lipsește sau nu este valid. Deschide această pagină din pagina cărții, ca propunerea să fie asociată ediției corecte.",
      editionsKicker: "Istoric de publicare", editionsTitle: "Ediții", editionsLead: "Datele publicării, jurnalele schimbărilor și PDF-urile păstrate pentru fiecare ediție publicată.", current: "Curentă", published: "Publicată", changes: "Ce s-a schimbat", download: "Descarcă PDF", back: "Vezi cartea", noPdf: "Această ediție nu are un PDF publicat.", loadError: "Istoricul edițiilor nu a putut fi încărcat.",
    },
    pl: {
      createKicker: "Twórz ze społecznością", createTitle: "Zaproponuj książkę wartą stworzenia.", createLead: "Prześlij materiały źródłowe i precyzyjne wytyczne do niszowej książki, podręcznika, poradnika lub wymagającej długiej formy. Formularz przygotowuje e-mail do redakcji ScriptaHub.",
      name: "Twoje imię i nazwisko", email: "E-mail do odpowiedzi", url: "Strona, którą chcesz promować", files: "Dokumenty źródłowe", filesNote: "Wybierz dokumenty tutaj, a potem dołącz je ręcznie po otwarciu programu pocztowego; przeglądarka nie może automatycznie dodawać załączników.", prompt: "Wytyczne do książki", promptHint: "Odbiorcy, cel, zakres, struktura, perspektywy, kryteria jakości…", titles: "Proponowane tytuły", titlesHint: "Jeden lub kilka możliwych tytułów", propose: "Zaproponuj książkę", mailNote: "Wysłanie otwiera program pocztowy ze sformatowaną wiadomością do create@scriptahub.com.", mailReady: "Program pocztowy powinien się otworzyć. Pamiętaj o dołączeniu wybranych dokumentów.", createSubject: "Propozycja książki ScriptaHub",
      contractTitle: "Umowa dotycząca wkładu", contractIntro: "Przed zaproponowaniem książki akceptujesz następujące warunki:", contractItems: ["Posiadasz prawa własności intelektualnej do wszystkiego, co przesyłasz, masz zgodę na przesłanie albo materiał jest w domenie publicznej lub ma zgodną licencję.", "Udzielasz ScriptaHub ogólnoświatowej, niewyłącznej zgody na przeglądanie, przechowywanie, redagowanie, tłumaczenie, łączenie i adaptowanie zgłoszenia w celu oceny i tworzenia wydań.", "Każda część włączona do opublikowanego wydania może zostać udostępniona na licencji Creative Commons Uznanie autorstwa 4.0 (CC BY 4.0), która pozwala dzielić się i adaptować, także komercyjnie, z podaniem autorstwa.", "Nie prześlesz materiałów poufnych, uzyskanych nielegalnie, naruszających prywatność lub cudze prawa. Odpowiadasz za zgłoszenie i zachowujesz własność oryginalnego materiału."], contractAccept: "Przeczytałem(-am) i akceptuję tę umowę.", contractLink: "Przeczytaj podsumowanie CC BY 4.0",
      feedbackKicker: "Ulepsz to wydanie", feedbackTitle: "Zaproponuj wartościową zmianę.", feedbackLead: "Opisz poprawkę stylistyczną, redakcyjną, rzeczową lub koncepcyjną na tyle dokładnie, aby można ją było ocenić i włączyć.", promise: "Sugestie uznane za wartościowe przez kontrole wspomagane AI i ludzkich recenzentów mogą trafić do kolejnego wydania. Istotni współtwórcy mogą zostać wymienieni; przyjęcie i uznanie autorstwa to decyzje redakcyjne.", kind: "Rodzaj wkładu", kinds: ["Struktura redakcyjna", "Styl pisania", "Korekta faktów", "Argument lub perspektywa", "Dostępność", "Inne"], feedback: "Proponowana zmiana lub opinia", feedbackHint: "Wskaż fragment, wyjaśnij problem i w miarę możliwości zaproponuj lepszą wersję.", sources: "Źródła lub kontekst", sourcesHint: "Linki, cytowania, przykłady lub uzasadnienie", send: "Wyślij opinię", feedbackSubject: "Opinia o wydaniu ScriptaHub", missingBook: "Brakuje kontekstu książki lub jest on nieprawidłowy. Otwórz tę stronę ze strony książki.",
      editionsKicker: "Historia publikacji", editionsTitle: "Wydania", editionsLead: "Daty, rejestry zmian i trwałe pliki PDF wszystkich opublikowanych wydań.", current: "Aktualne", published: "Opublikowano", changes: "Zmiany", download: "Pobierz PDF", back: "Zobacz książkę", noPdf: "Dla tego wydania nie opublikowano pliku PDF.", loadError: "Nie udało się wczytać historii wydań.",
    },
  };

  const contractIntros = {
    en: "Before submitting a contribution, you agree to these terms:",
    fr: "Avant d’envoyer une contribution, vous acceptez les conditions suivantes :",
    de: "Bevor Sie einen Beitrag senden, stimmen Sie diesen Bedingungen zu:",
    es: "Antes de enviar una contribución, aceptas estas condiciones:",
    pt: "Antes de enviar uma contribuição, você aceita estas condições:",
    it: "Prima di inviare un contributo, accetti queste condizioni:",
    ro: "Înainte să trimiți o contribuție, accepți următoarele condiții:",
    pl: "Przed wysłaniem wkładu akceptujesz następujące warunki:",
  };
  Object.entries(contractIntros).forEach(([code, intro]) => { text[code].contractIntro = intro; });

  const createFieldLabels = {
    en: { title: "Proposed title", titleHint: "A working title (optional)", chooseFiles: "Choose attachments", attachmentNote: "Email cannot include files automatically. Attach the selected documents when your mail app opens." },
    fr: { title: "Titre proposé", titleHint: "Un titre de travail (facultatif)", chooseFiles: "Choisir les pièces jointes", attachmentNote: "L’e-mail ne peut pas inclure les fichiers automatiquement. Joignez les documents sélectionnés dans votre messagerie." },
    de: { title: "Vorgeschlagener Titel", titleHint: "Ein Arbeitstitel (optional)", chooseFiles: "Anhänge auswählen", attachmentNote: "Dateien können nicht automatisch in die E-Mail eingefügt werden. Hängen Sie die ausgewählten Dokumente im E-Mail-Programm an." },
    es: { title: "Título propuesto", titleHint: "Un título provisional (opcional)", chooseFiles: "Elegir adjuntos", attachmentNote: "El correo no puede incluir archivos automáticamente. Adjunta los documentos seleccionados cuando se abra tu aplicación de correo." },
    pt: { title: "Título proposto", titleHint: "Um título provisório (opcional)", chooseFiles: "Escolher anexos", attachmentNote: "O e-mail não pode incluir arquivos automaticamente. Anexe os documentos selecionados quando o aplicativo de e-mail abrir." },
    it: { title: "Titolo proposto", titleHint: "Un titolo provvisorio (facoltativo)", chooseFiles: "Scegli allegati", attachmentNote: "L’e-mail non può includere file automaticamente. Allega i documenti selezionati quando si apre l’app di posta." },
    ro: { title: "Titlu propus", titleHint: "Un titlu de lucru (opțional)", chooseFiles: "Alege atașamente", attachmentNote: "E-mailul nu poate include automat fișiere. Atașează documentele selectate când se deschide aplicația de e-mail." },
    pl: { title: "Proponowany tytuł", titleHint: "Tytuł roboczy (opcjonalnie)", chooseFiles: "Wybierz załączniki", attachmentNote: "Plików nie można automatycznie dodać do wiadomości. Dołącz wybrane dokumenty po otwarciu programu pocztowego." },
  };

  const escape = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  const params = () => new URLSearchParams(location.search);
  const language = () => collection.supportedLanguages.some((item) => item.code === document.documentElement.lang) ? document.documentElement.lang : "en";
  const activeBook = () => collection.books.find((book) => book.directory === params().get("book"));
  const field = (label, name, type = "text", wide = false, placeholder = "", required = false, extraClass = "") => `<label class="form-field${wide ? " form-field-wide" : ""}${extraClass ? ` ${extraClass}` : ""}"><span>${escape(label)}</span><input type="${type}" name="${name}" placeholder="${escape(placeholder)}"${required ? " required" : ""}></label>`;
  const textarea = (label, name, placeholder, required = false, extraClass = "") => `<label class="form-field form-field-wide${extraClass ? ` ${extraClass}` : ""}"><span>${escape(label)}</span><textarea name="${name}" placeholder="${escape(placeholder)}"${required ? " required" : ""}></textarea></label>`;
  const pageHero = (kicker, title, lead = "") => `<section class="workflow-hero"><div><p class="eyebrow">${escape(kicker)}</p><h1>${escape(title)}</h1></div>${lead ? `<p class="lead">${escape(lead)}</p>` : ""}</section>`;
  const agreementCard = (words) => `<aside class="workflow-context contribution-agreement"><p class="eyebrow">ScriptaHub</p><h2>${escape(words.contractTitle)}</h2><p>${escape(words.contractIntro)}</p><ol>${words.contractItems.map((item) => `<li>${escape(item)}</li>`).join("")}</ol><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">${escape(words.contractLink)}</a><label class="contract-accept"><input type="checkbox" data-contract-accept><span>${escape(words.contractAccept)}</span></label></aside>`;
  const bookContext = (book, lang, words) => {
    if (!book) return `<aside class="workflow-context"><p>${escape(words.missingBook)}</p></aside>`;
    const title = book.title[lang] || book.title.en;
    const description = book.shortDescription[lang] || book.shortDescription.en;
    return `<aside class="workflow-context"><img src="../${escape(book.thumbnailUrl[lang] || book.thumbnailUrl.en)}" alt=""><h2>${escape(title)}</h2><p>${escape(description)}</p><a class="button button-quiet" href="../${escape(book.editions[lang].book)}?lang=${lang}">${escape(words.back)}</a></aside>`;
  };
  const compactBookContext = (book, lang, words) => {
    if (!book) return `<aside class="workflow-context"><p>${escape(words.missingBook)}</p></aside>`;
    const title = book.title[lang] || book.title.en;
    const description = book.shortDescription[lang] || book.shortDescription.en;
    const href = `../${book.editions[lang].book}?lang=${lang}`;
    return `<aside class="workflow-context workflow-book-compact"><a href="${escape(href)}" aria-label="${escape(`${words.back}: ${title}`)}"><img src="../${escape(book.thumbnailUrl[lang] || book.thumbnailUrl.en)}" alt="${escape(title)}"></a><div><h2>${escape(title)}</h2><p>${escape(description)}</p></div></aside>`;
  };
  const mail = (subject, lines) => `mailto:create@scriptahub.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    const grantApiVersion = 1;
    const accountReload = {
        en: "Reload this page to update sign-in, then try again. Copy any unsent text before reloading.",
        fr: "Rechargez cette page pour mettre à jour la connexion, puis réessayez. Copiez tout texte non envoyé avant de recharger.",
        de: "Laden Sie diese Seite neu, um die Anmeldung zu aktualisieren, und versuchen Sie es erneut. Kopieren Sie vorher ungesendeten Text.",
        es: "Recarga esta página para actualizar el inicio de sesión y vuelve a intentarlo. Copia el texto no enviado antes de recargar.",
        pt: "Recarregue esta página para atualizar o início de sessão e tente novamente. Copie o texto não enviado antes de recarregar.",
        it: "Ricarica questa pagina per aggiornare l’accesso, poi riprova. Copia il testo non inviato prima di ricaricare.",
        ro: "Reîncarcă această pagină pentru a actualiza autentificarea, apoi încearcă din nou. Copiază textul netrimis înainte de reîncărcare.",
        pl: "Odśwież tę stronę, aby zaktualizować logowanie, i spróbuj ponownie. Przed odświeżeniem skopiuj niewysłany tekst.",
    };
  const accountUnavailable = {
    en: "Account sign-in is currently unavailable. Please try again.",
    fr: "La connexion à votre compte est momentanément indisponible. Veuillez réessayer.",
    de: "Die Anmeldung ist derzeit nicht verfügbar. Bitte versuchen Sie es erneut.",
    es: "El inicio de sesión no está disponible en este momento. Inténtalo de nuevo.",
    pt: "O início de sessão está indisponível neste momento. Tente novamente.",
    it: "L’accesso all’account non è al momento disponibile. Riprova.",
    ro: "Autentificarea nu este disponibilă momentan. Încearcă din nou.",
    pl: "Logowanie jest obecnie niedostępne. Spróbuj ponownie.",
  };

  function renderCreate(lang) {
    const words = text[lang];
    const fields = createFieldLabels[lang];
    document.title = `${words.createTitle} · ScriptaHub`;
    const agreement = agreementCard(words);
    root.innerHTML = `${pageHero(words.createKicker, words.createTitle)}<section class="workflow-layout create-workflow-layout"><form class="workflow-form create-workflow-form" data-workflow-form><div class="form-grid create-form-grid">
      ${field(words.name, "name", "text", false, "", true, "create-name-field")}
      ${field(words.email, "email", "email", false, "", false, "create-email-field")}
      <label class="form-file-field"><input class="form-file-input" type="file" name="documents" multiple aria-label="${escape(words.files)}"><span class="form-file-picker"><strong>${escape(words.files)}</strong><span class="form-file-button"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8.5 12.8 14 7.3a3.2 3.2 0 0 1 4.5 4.5l-7.1 7.1a5 5 0 0 1-7.1-7.1l7.5-7.5"/></svg>${escape(fields.chooseFiles)}</span><span class="form-file-selection" data-file-selection aria-live="polite"></span></span></label>
      ${field(words.url, "url", "url", false, "https://", false, "create-url-field")}
      ${field(fields.title, "titles", "text", false, fields.titleHint, false, "create-title-field")}
      ${textarea(words.prompt, "prompt", words.promptHint, true, "create-instructions-field")}
      </div><button class="workflow-submit" type="submit" disabled>${escape(words.propose)}</button><p class="workflow-note">${escape(words.mailNote)} ${escape(fields.attachmentNote)}</p><p class="workflow-status" data-workflow-status aria-live="polite"></p></form>${agreement}</section>`;
    const form = root.querySelector("form");
    const documents = form.elements.documents;
    const fileSelection = form.querySelector("[data-file-selection]");
    const compactFileName = (name) => {
      const dot = name.lastIndexOf(".");
      const extension = dot > 0 && name.length - dot <= 8 ? name.slice(dot) : "";
      const stem = extension ? name.slice(0, dot) : name;
      const headLength = Math.max(6, 14 - extension.length);
      return name.length <= headLength + extension.length ? name : `${stem.slice(0, headLength)}…${extension}`;
    };
    const updateFileSelection = () => {
      const names = [...documents.files].map((file) => file.name);
      fileSelection.replaceChildren();
      if (!names.length) return;
      const list = document.createElement("ul");
      names.forEach((name) => {
        const item = document.createElement("li");
        item.textContent = compactFileName(name);
        item.title = name;
        list.append(item);
      });
      fileSelection.append(list);
    };
    documents.addEventListener("change", updateFileSelection);
    const contract = root.querySelector("[data-contract-accept]");
    const submit = form.querySelector("[type=submit]");
    contract.addEventListener("change", () => { submit.disabled = !contract.checked; });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!contract.checked || !form.reportValidity()) return;
      const data = new FormData(form);
      const files = [...form.elements.documents.files].map((file) => file.name);
      const lines = [
        `Name: ${data.get("name") || ""}`, `Reply email: ${data.get("email") || ""}`, `Promotional URL: ${data.get("url") || ""}`,
        `Selected documents (attach manually): ${files.join(", ") || "None"}`, `Contribution agreement accepted: yes`, "", "PROPOSED TITLE", data.get("titles") || "", "", "BOOK INSTRUCTIONS", data.get("prompt") || "", "", `Interface language: ${lang}`,
      ];
      root.querySelector("[data-workflow-status]").textContent = words.mailReady;
      location.href = mail(words.createSubject, lines);
    });
  }

    function renderFeedback(lang) {
        const words = text[lang];
        const book = activeBook();
        document.title = `${words.feedbackTitle} · ScriptaHub`;
        const side = `<div class="workflow-aside-stack">${compactBookContext(book, lang, words)}${agreementCard(words)}</div>`;
        root.innerHTML = `${pageHero(words.feedbackKicker, words.feedbackTitle)}<section class="workflow-layout"><form class="workflow-form" data-workflow-form><p class="workflow-message">${escape(words.promise)}</p><div class="form-grid">${field(words.name, "name", "text", false, "", true)}${field(words.email, "email", "email")}${field(words.url, "url", "url", true, "https://")}
            <label class="form-field form-field-wide"><span>${escape(words.kind)}</span><select name="kind">${words.kinds.map((kind) => `<option>${escape(kind)}</option>`).join("")}</select></label>${textarea(words.feedback, "feedback", words.feedbackHint, true)}${textarea(words.sources, "sources", words.sourcesHint)}</div><button class="workflow-submit" type="submit" disabled>${escape(words.send)}</button><p class="workflow-note">${escape(words.mailNote)}</p><p class="workflow-status" data-workflow-status aria-live="polite"></p></form>${side}</section>`;
        const form = root.querySelector("form");
        const contract = root.querySelector("[data-contract-accept]");
        const submit = form.querySelector("[type=submit]");
        let awaitingAccount = false;
        contract.addEventListener("change", () => { submit.disabled = awaitingAccount || !book || !contract.checked; });
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (awaitingAccount || !book || !contract.checked || !form.reportValidity()) return;
            const status = form.querySelector("[data-workflow-status]");
            awaitingAccount = true;
            submit.disabled = true;
            status.textContent = "";
            try {
                const gate = globalThis.ScriptaHubAuth;
                if (gate?.grantApiVersion !== grantApiVersion || typeof gate.requireAccount !== "function") {
                    status.textContent = accountReload[lang];
                    return;
                }
                const grant = await gate.requireAccount("feedback", form, grantApiVersion);
                if (!grant) return;
                if (!form.isConnected || !contract.checked || !form.reportValidity()) { grant.cancel(); return; }
                grant.publish(() => {
                    if (!form.isConnected || !contract.checked || !form.reportValidity()) throw new Error("Feedback changed");
                    const data = new FormData(form);
                    const lines = [
                        `Book ID: ${book.id}`, `Book: ${book.title[lang] || book.title.en}`, `Book directory: ${book.directory}`, `Edition language: ${lang}`, `Contribution type: ${data.get("kind") || ""}`,
                        `Name: ${data.get("name") || ""}`, `Reply email: ${data.get("email") || ""}`, `Promotional URL: ${data.get("url") || ""}`, `Contribution agreement accepted: yes`, "", "PROPOSED CHANGE / FEEDBACK", data.get("feedback") || "", "", "SOURCES / CONTEXT", data.get("sources") || "",
                    ];
                    status.textContent = words.mailReady;
                    location.href = mail(`${words.feedbackSubject}: ${book.title[lang] || book.title.en}`, lines);
                });
            } catch {
                status.textContent = accountUnavailable[lang];
            } finally {
                awaitingAccount = false;
                submit.disabled = !book || !contract.checked;
            }
        });
    }

  async function renderEditions(lang) {
    const words = text[lang];
    const book = activeBook();
    document.title = `${words.editionsTitle} · ScriptaHub`;
    if (!book) {
      root.innerHTML = `${pageHero(words.editionsKicker, words.editionsTitle, words.editionsLead)}<p class="workflow-message">${escape(words.missingBook)}</p>`;
      return;
    }
    root.innerHTML = `${pageHero(words.editionsKicker, `${words.editionsTitle}: ${book.title[lang] || book.title.en}`, words.editionsLead)}<section class="workflow-layout"><div class="editions-list" data-editions-list><p class="workflow-message">…</p></div>${bookContext(book, lang, words)}</section>`;
    try {
      const response = await fetch(`../${book.directory}/editions.json`);
      if (!response.ok) throw new Error(String(response.status));
      const history = await response.json();
      const list = root.querySelector("[data-editions-list]");
      list.innerHTML = [...history.editions].sort((a, b) => Number(b.number) - Number(a.number)).map((edition) => {
        const current = edition.id === history.currentEdition ? `<span class="edition-date">${escape(words.current)}</span>` : "";
        const label = edition.label?.[lang] || edition.label?.en || `Edition ${edition.number}`;
        const changes = edition.changes?.[lang] || edition.changes?.en || "";
        const date = new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(new Date(`${edition.publishedAt}T12:00:00`));
        const downloads = Object.entries(edition.pdf || {}).map(([code, path]) => `<a href="../${escape(book.directory)}/${escape(path)}" data-auth-action="download" download>${escape(words.download)} · ${escape(collection.supportedLanguages.find((item) => item.code === code)?.name || code)}</a>`).join("");
        return `<article class="edition-card"><div>${current}<p class="edition-date">${escape(words.published)} ${escape(date)}</p></div><div><h2>${escape(label)}</h2><p class="edition-changes"><strong>${escape(words.changes)}:</strong> ${escape(changes)}</p><div class="edition-downloads">${downloads || `<span class="workflow-note">${escape(words.noPdf)}</span>`}</div></div></article>`;
      }).join("");
    } catch {
      root.querySelector("[data-editions-list]").innerHTML = `<p class="workflow-message">${escape(words.loadError)}</p>`;
    }
  }

  function render(lang = language()) {
    const page = document.body.dataset.workflowPage;
    if (page === "create") renderCreate(lang);
    else if (page === "feedback") renderFeedback(lang);
    else renderEditions(lang);
  }

  document.addEventListener("scriptahub:language", (event) => render(event.detail.language));
  render();
})();
