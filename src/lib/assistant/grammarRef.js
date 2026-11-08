// Справка школы по грамматике и лексике A1–B2 — рядом с вопросом ученика (ТЗ v2.0, 8.2 и 8.3а: «справка по грамматике
// и лексике — из базы знаний программы, а не из памяти модели»). Модель остаётся Haiku 5.5 (решение владельца
// 08.11.2026), а её память подводила как раз на правилах: «I like to read» объявляла ошибкой, у wish забывала схему о
// прошлом, «speak about» считала неверным, не знала, какая d молчит в Wednesday (эталонный набор, 07.11.2026).
//
// Как устроено: запись — одна тема или одна частая ошибка, с регуляркой по словам вопроса. К вопросу уходят только
// совпавшие записи (не больше MAX_ENTRIES) — так справка не растит каждый запрос и не ломает кэш: системный промпт тот
// же, а вопрос и так в некэшируемой части. Для казахского ответа добавляется словарь терминов: из русских указаний в
// казахский ответ шли «подлежащее», «3-я форма», «Ключевая конструкция».
//
// Правила для тех, кто правит:
//  - только проверенные факты английского; спорное не пишем («оба варианта верны» — тоже факт, и его модель как раз
//    теряла);
//  - примеры — свои или из основного эталонного набора, НЕ из контрольных вопросов (scripts/assistant-eval,
//    holdout): по ним мерим, что справка помогает вообще, а не только тем вопросам, под которые писалась;
//  - регулярки — по словам вопроса; \b в JS видит только латиницу, поэтому у кириллицы границ нет;
//  - текст на проверку методисту, как и эталонный набор.

export const MAX_ENTRIES = 4

// Вопрос об английском, а не о сайте: без этого «Где Speaking Buddy?» поднимал бы справку по speak/talk.
const LANG_Q = /(по-английски|ағылшынша|английск|переведи|перевести|перевод|аудар|как (сказать|спросить|произнос|правильно)|что значит|что означает|деген не|қалай айт|қалай болады|правильно ли|можно ли сказать|дұрыс па|бола ма|айтуға|почему (нельзя|говорят|ошибка|«)|в чём разница|в чем разница|чем отлича|айырмашы|объясни|түсіндір|ереже|правил|произнос|ударени|айтылу|екпін|грамматик|провер|тексер|\bcheck\b|\bcorrect\b|difference|\bmean\b|how do (i|you) say|is it correct|can i say|what does)/i
// Грамматические термины ru/kk — вопрос об английском и без английских слов («Когда к глаголу добавляется -s?»).
const GRAMMAR_TERMS = /глагол|артикл|услов|степен|предлог|местоим|прилагат|существит|причаст|залог|времен[иа]|-s\b|-ing\b|-ed\b|етістік|шақ\b|есімдік|сын есім|зат есім/i
// Названия разделов сайта латиницей — не английский вопрос: «Где Speaking Buddy?» справки не просит.
const SITE_NAMES = /speaking buddy|speakspin|feedback|ielts|\bsat\b|word hunt|word rush|speak or die|cartoon world|pronunciation world|prepositions world|just to listen|whatsapp|google|telegram/gi
const latinWords = (s) => (String(s).replace(SITE_NAMES, ' ').match(/[A-Za-z]{2,}/g) || []).length

export const GRAMMAR_REF = [
  // ------------------------------------------------------------------ грамматика
  { id: 'a-an', kk: "a / an: a — дауыссыз ДЫБЫСТЫҢ алдында, an — дауысты ДЫБЫСТЫҢ алдында; әріп емес, дыбыс шешеді: an apple, an hour, бірақ a university, a European.",
    match: /артикл|article|\ban\b.*\ba\b|\ba\b.*\ban\b/i,
    text: 'a / an: a — перед согласным ЗВУКОМ, an — перед гласным ЗВУКОМ; решает звук, а не буква: an apple, an hour, an honest man, но a university, a European, a one-way ticket.' },
  // Только вопрос об артиклях: «the» есть почти в любом английском тексте и вытесняло нужные записи.
  { id: 'the', kk: "the — қайсысы екені белгілі болғанда: бұрын айтылған немесе жалғыз (the sun, the internet); a/an — көптің бірі, алғаш аталғанда. Жалпы мағынада көпше және саналмайтын зат есім артикльсіз: Life is beautiful, I like music; the life of my grandfather — нақты өмір. Қазақ тілінде артикль жоқ, сондықтан оны жиі түсіріп кетеді.",
    match: /артикл|article|a мен the/i,
    text: 'the — когда ясно, о каком именно: уже упоминали, единственный в своём роде (the sun, the internet); a/an — один из многих, называем впервые. Без артикля — множественное и неисчисляемое в общем смысле: Life is beautiful, I like music; the life of my grandfather — конкретная. В русском и казахском артиклей нет — их пропускают.' },
  { id: 'this-that', match: /\bthis\b.*\bthat\b|\bthat\b.*\bthis\b|\bthese\b|\bthose\b/i,
    text: 'this (мн. these) — близко к говорящему, that (мн. those) — дальше, «тот, там»: this book here, that house over there.' },
  { id: 'have-got', match: /have got|has got|у меня есть/i,
    text: 'have и have got — оба верны: I have a car = I\'ve got a car (have got — чаще британский разговорный). Вопрос: Do you have…? / Have you got…? С he/she/it — has / has got.' },
  { id: 'present-simple', kk: "Present Simple: he/she/it-пен етістікке -s жалғанады (works); s, sh, ch, x, o-дан кейін -es (goes, watches); дауыссыз + y → -ies (studies); have → has. Сұраулы және болымсыз сөйлемде do/does + етістіктің негізгі формасы: Does she like…? She doesn't like… (doesn't likes емес). Жиі қате: He don't like, She have, My sister work.",
    match: /present simple|\bdoes\b|\bdoesn'?t\b|\b(he|she|it) (don'?t|have|go|like|work|prefer)\b|-s\b.*глагол|глагол.*-s\b|3-?(е|м)? лиц|третьем лице|үшінші жақ/i,
    text: 'Present Simple: с he/she/it к глаголу -s (works); -es после s, sh, ch, x, o (goes, watches); согласная + y → -ies (studies); have → has. Вопрос и отрицание — do/does + начальная форма: Does she like…? She doesn\'t like… (не doesn\'t likes). Частые ошибки: He don\'t like, She have, My sister work.' },
  { id: 'questions', kk: "Сұраулы сөйлем: (сұрақ сөзі) + do/does/did + бастауыш + етістік: Where do you live? (Where you live? емес). be мен модаль етістіктерде — жай орын ауыстыру: Where are you? Can you help me? Қазақшада сұрақты ма/ме шылауы мен сұрақ сөзі береді, сондықтан көмекші етістікті түсіріп кетеді.",
    match: /вопрос|сұрақ|сұраулы|where you|how to say|word order|порядок слов|сөз тәртібі/i,
    text: 'Вопрос: (вопросительное слово) + do/does/did + подлежащее + глагол: Where do you live? (не Where you live?). С be и модальными — просто перестановка: Where are you? Can you help me? В русском вопрос держит интонация, в казахском — частица ма/ме и вопросительное слово, поэтому вспомогательный глагол теряют.' },
  { id: 'word-order', kk: "Хабарлы сөйлемдегі сөз тәртібі: бастауыш + етістік + толықтауыш — I learn English. Қазақшада етістік соңында тұрады (Мен ағылшын тілін үйренемін), сондықтан I English learn деп қате айтады.",
    match: /порядок слов|сөз тәртібі|word order|i english learn|английский учу/i,
    text: 'Порядок слов в утверждении: подлежащее + глагол + дополнение — I learn English. В казахском глагол в конце (Мен ағылшын тілін үйренемін), поэтому глагол ставят последним: I English learn — ошибка.' },
  { id: 'requests', kk: "Өтініш: Can you help me? — қарапайым, Could you help me? — сыпайырақ, Would you mind helping me? — өте сыпайы.",
    match: /көмектес|помоги|помочь|can you help|could you/i,
    text: 'Просьба: Can you help me? — обычная, Could you help me? — вежливее, Would you mind helping me? — очень вежливо.' },
  { id: 'there-is', match: /there (is|are)/i,
    text: 'there is — с единственным и неисчисляемым (There is a book / some milk), there are — с множественным (There are two books). Значит «есть, находится».' },
  { id: 'present-continuous', kk: "Present Continuous: am/is/are + етістік + -ing — қазір немесе осы кезеңде болып жатқан іс (I'm reading, I'm learning English this year); уағдаластырылған болашақ іс те (I'm meeting Tom at five tomorrow). Күй етістіктері (know, like, want) әдетте -ing алмайды: I know, I'm knowing емес.",
    match: /continuous|прямо сейчас|обычно.*сегодня|сегодня.*обычно|\busually\b|жүрмін|қазір|am .*ing|is .*ing|are .*ing/i,
    text: 'Present Continuous: am/is/are + -ing — действие сейчас или в этот период (I\'m reading, I\'m learning English this year); ещё — договорённость на будущее с временем или людьми (I\'m meeting Tom at five tomorrow). Глаголы состояния (know, like, want, believe, belong) обычно без -ing: I know, не I\'m knowing. Обычное, повторяющееся — Present Simple: I usually walk, but today I\'m taking the bus.' },
  { id: 'past-simple', kk: "Past Simple: дұрыс етістіктер + -ed (worked; stop → stopped, study → studied), бұрыс етістіктердің өз екінші формасы бар (go → went, see → saw, have → had). Сұраулы және болымсыз сөйлемде did/didn't + негізгі форма: Did you go? I didn't go (didn't went емес). Белгілері: yesterday, last week, in 2019, ago; олармен Present Perfect қолданылмайды.",
    match: /past simple|прошедш|өткен шақ|\bwent\b|\bgoed\b|\bdid\b|\bdidn'?t\b|yesterday|кеше|вчера|have went|has went/i,
    text: 'Past Simple: правильные + -ed (worked; stop → stopped, study → studied), неправильные — вторая форма (go → went, see → saw, have → had); их учат. Вопрос и отрицание — did/didn\'t + начальная форма: Did you go? I didn\'t go (не didn\'t went, не goed). Маркеры: yesterday, last week, in 2019, ago. С ними не Present Perfect: Yesterday I went (не I have went).' },
  { id: 'was-were', kk: "be өткен шақта: I/he/she/it was, we/you/they were (we was емес): I was at home yesterday.",
    match: /\bwas\b|\bwere\b|was\/were|we was|i am at home/i,
    text: 'be в прошлом: I/he/she/it was, we/you/they were (не we was). «Вчера я был дома» — I was at home yesterday.' },
  { id: 'present-perfect', kk: "Present Perfect: have/has + етістіктің үшінші формасы (V3). Уақыты айтылмаған тәжірибе (I have been to London), қазіргі нәтиже (I've lost my keys), осы уақытқа дейінгі кезең for/since-пен (I have lived here for five years / since 2020). Нақты өткен уақытпен (yesterday, last week, in 2019) — Past Simple. Жиі қате: I live here for five years → I have lived / I've been living here for five years.",
    match: /present perfect|perfect|have been|\b(have|has) \w+(ed|en)\b|\balready\b|\byet\b|\bever\b|\bsince\b|\bfor (two|three|five|\d+) years\b|уже (сделал|был|поел)|уже сдела|пять лет|үш жыл|жылдан бері|лет живу|живу здесь/i,
    text: 'Present Perfect: have/has + третья форма (V3). Опыт без даты (I have been to London), результат сейчас (I\'ve lost my keys), период до сейчас с for/since (I have lived here for five years / since 2020). С точным прошлым временем (yesterday, last week, in 2019, ago) — Past Simple: I received it yesterday (не I have received it yesterday). Ошибка русско- и казахскоязычных: I live here for five years → I have lived / I\'ve been living here for five years.' },
  { id: 'for-since', kk: "for + уақыт аралығы (for five years, for a week), since + басталған сәт (since 2020, since Monday): I have lived here for five years / since 2020.",
    match: /\bsince\b|\bfor\b.*\bsince\b|for или since|for пен since/i,
    text: 'for + период (for five years, for a week), since + момент начала (since 2020, since Monday, since I was a child): I have lived here for five years / since 2020.' },
  { id: 'pp-continuous', kk: "Present Perfect Continuous: have/has been + -ing — осы уақытқа дейін созылған іс (I've been working for three hours). live, work, study етістіктерімен екеуі де дұрыс: I have lived / I've been living here for two years.",
    match: /perfect continuous|been .*ing/i,
    text: 'Present Perfect Continuous: have/has been + -ing — длительность, процесс до сейчас (I\'ve been working for three hours; I\'m tired — I\'ve been running). Present Perfect — результат, сколько сделано (I\'ve written three letters). Глаголы состояния — без Continuous: I\'ve known him for years. С live, work, study верны оба: I have lived / I\'ve been living here for two years.' },
  { id: 'used-to', kk: "used to + етістік — бұрын болған, қазір жоқ әдет: I used to play football; be used to + зат есім немесе -ing — үйреніп кету: I'm used to getting up early, I'm used to it; get used to — үйрену (I've got used to it — үйреніп кеттім).",
    match: /used to|привык|үйреніп кет|үйрендім|раньше.*(а теперь|теперь нет)/i,
    text: 'used to + глагол — привычка или состояние в прошлом, которого сейчас нет: I used to play football; отрицание и вопрос — didn\'t use to / Did you use to…? be used to + существительное или -ing — привыкнуть, быть привычным: I\'m used to getting up early, I\'m used to it; get used to — привыкать (I\'ve got used to it — уже привык).' },
  { id: 'future', match: /going to|\bwill\b|будущ|келер шақ/i,
    text: 'be going to — план, решено заранее, или прогноз по видимым признакам (Look at the clouds — it\'s going to rain); will — решение в момент речи, обещание, предположение (I\'ll help you; I think it will rain); Present Continuous — договорённость с временем или людьми (I\'m meeting Tom tomorrow).' },
  { id: 'time-clauses', match: /\b(when|as soon as|before|after|until)\b.*\bwill\b|\bwill\b.*\b(when|as soon as)\b/i,
    text: 'После when, as soon as, before, after, until о будущем — Present Simple, а не will: When I finish, I\'ll call you (не When I will finish). То же после if.' },
  { id: 'conditionals', match: /conditional|условн|\bif\b|\bwould\b|если бы|егер/i,
    text: 'Условные: First — If + Present Simple, will + глагол, реальное будущее: If it rains, I\'ll stay at home (в части с if will не ставят). Second — If + Past Simple, would + глагол, нереальное или маловероятное сейчас и в будущем: If I had money, I would buy a car; If I were you… (were для всех лиц, разговорно и was). Third — If + had + V3, would have + V3, нереальное прошлое: If I had studied, I would have passed. Русское «если бы …, то бы» бывает и о настоящем (второе), и о прошлом (третье) — по смыслу.' },
  { id: 'wish', match: /\bwish\b|жаль, что|if only|өкінішті/i,
    text: 'wish + Past Simple — сожаление о настоящем: I wish I knew (жаль, что я не знаю), I wish I were taller; wish + Past Perfect — о прошлом: I wish I had known (жаль, что не знал); wish + would — недовольство чужим поведением или желание перемены: I wish you would stop, I wish it would stop raining. Сама фраза I wish I didn\'t know верна, но значит «жаль, что я знаю».' },
  { id: 'passive', kk: "Ырықсыз етіс (Passive): тиісті шақтағы be + етістіктің үшінші формасы (V3): The house was built in 1990, English is spoken here, The book was written by Abai. by + орындаушы — ол маңызды болса ғана.",
    match: /passive|страдательн|ырықсыз|was built|was written|\bby\b.*v3/i,
    text: 'Страдательный залог: be в нужном времени + третья форма (V3, причастие прошедшего времени): The house was built in 1990, English is spoken here, The book was written by Abai. by + исполнитель — только если он важен. Нужен, когда важнее действие или результат, а не кто сделал.' },
  { id: 'ing-to', match: /-ing.*\bto\b|\bto\b.*-ing|герунди|инфинитив|\bstop(ped)? (to|smoking)\b|\bremember (to|doing)\b|\benjoy\b|like (reading|to read)|нравится читать/i,
    text: 'После enjoy, finish, avoid, mind, keep, practise — -ing (I enjoy reading); после want, decide, hope, plan, agree, need — to + глагол (I want to go). like, love, hate, start, begin — и так и так: I like reading = I like to read, оба верны. Смысл меняется: stop smoking — бросить курить, stop to smoke — остановиться, чтобы покурить; remember doing — помнить, что сделал, remember to do — не забыть сделать.' },
  { id: 'relative', match: /\bwho\b|\bwhich\b|придаточн|relative/i,
    text: 'who — о людях, which — о предметах и животных; that — вместо них в определительных БЕЗ запятой: The book that I bought… После запятой (уточнение, без которого смысл ясен) — только who/which: My brother, who lives in Almaty, …' },
  { id: 'past-continuous', match: /past continuous|\bwas .*ing\b|\bwere .*ing\b|\bwhile\b/i,
    text: 'Past Continuous: was/were + -ing — действие шло в момент в прошлом; короткое действие, которое его прервало, — Past Simple: I was cooking when the phone rang; While I was cooking, …' },
  { id: 'reported', match: /косвенн|reported|\bsaid\b|\btold\b|сказал, что/i,
    text: 'Косвенная речь после said/told в прошлом: время сдвигается назад (am/is → was, will → would, Present Simple → Past Simple), местоимения меняются: He said (that) he was tired. Если сказанное верно и сейчас, сдвиг можно не делать. say — что сказал (said that, said to me), tell — кому (told me that); не said me.' },
  { id: 'must-have-to', match: /\bmust\b|have to|mustn|должен|керек/i,
    text: 'must — обязанность от говорящего, правило, сильный совет; have to — необходимость извне. mustn\'t — нельзя; don\'t have to — не обязательно, можно не делать. В прошлом — had to.' },
  { id: 'modal-no-to', kk: "can, could, must, should, may, might, will, would-дан кейін етістік to-сыз: I can swim (can to swim емес).",
    match: /\b(can|could|must|should|may|might) to\b|can.*\bto\b.*дұрыс/i,
    text: 'После can, could, must, should, may, might, will, would — глагол без to: I can swim (не can to swim), You should go.' },
  { id: 'comparatives', match: /сравнит|comparative|\bthan\b|more (tall|cheap|better|good)|\b\w+er than\b/i,
    text: 'Сравнение: короткие прилагательные + -er (cheap → cheaper, big → bigger, easy → easier), длинные — more (more expensive); исключения good → better, bad → worse, far → further. Дальше — than: cheaper than mine. Не more better, не more cheap.' },
  { id: 'much-many', match: /\bmuch\b|\bmany\b|a lot of/i,
    text: 'many — с исчисляемыми во множественном числе (many books), much — с неисчисляемыми (much water, much time); в утвердительных предложениях обычно a lot of; вопрос — How many…? / How much…?' },
  { id: 'some-any', match: /\bsome\b|\bany\b/i,
    text: 'some — в утвердительных (I have some apples), any — в вопросах и отрицаниях (Do you have any…? I don\'t have any…); some — и в просьбах и предложениях: Would you like some tea?' },
  { id: 'few-little', match: /\bfew\b|\blittle\b/i,
    text: 'a few / a little — немного, но достаточно; few / little — мало, почти нет (с оттенком «недостаточно»). few, a few — с исчисляемыми, little, a little — с неисчисляемыми.' },
  { id: 'uncountable', match: /information|advice|\bnews\b|furniture|неисчисля|саналмайтын/i,
    text: 'Неисчисляемые: information, advice, news, furniture, homework — без -s и без a: some information, a piece of advice (один совет), The news is good (не informations, не advices).' },
  { id: 'people', match: /\bpeople\b|\bchildren\b/i,
    text: 'people — множественное число от person: people are (a person is); children — от child.' },
  { id: 'ed-ing', match: /interest(ing|ed)|excit(ing|ed)|-ed.*-ing|-ing.*-ed/i,
    text: '-ed — что чувствует человек (I\'m interested in music, I\'m excited), -ing — какой предмет или человек для других (an interesting film, an exciting game). I am interesting in music — ошибка.' },
  { id: 'adj-order', kk: "Сын есім зат есімнің алдында тұрады: a red car, a big house (a car red емес).",
    match: /car red|прилагательн.*(перед|после)|сын есім/i,
    text: 'Прилагательное стоит перед существительным: a red car, a big house (не a car red).' },
  { id: 'he-she', kk: "he — ер адам немесе ұл бала, she — әйел немесе қыз бала, it — зат немесе жануар: He is my brother. Қазақшада бәріне бір «ол», сондықтан he мен she-ні шатастырады.",
    match: /\bhe\b.*\bshe\b|\bshe\b.*\bhe\b|she is my brother|he is my sister/i,
    text: 'he — мужчина или мальчик, she — женщина или девочка, it — предмет или животное: He is my brother. В казахском на всех одно «ол», поэтому he и she путают.' },
  { id: 'very', match: /very like|очень нравится|очень люблю/i,
    text: 'very не ставят перед глаголом: I like English very much / I really like English (не I very like).' },

  // ----------------------------------------------------- глагол + предлог, частые кальки
  { id: 'agree', kk: "agree — етістік, оған am керек емес: I agree (with you), I don't agree / I disagree. I am agree — қате.",
    match: /\bagree\b|согласен|согласна|келісемін/i,
    text: 'agree — глагол: I agree (with you), I don\'t agree / I disagree; не I am agree (калька с «я согласен»).' },
  { id: 'discuss', match: /\bdiscuss/i, text: 'discuss — без предлога: We discussed the problem (не discussed about); но a discussion about, talk about.' },
  { id: 'explain', match: /\bexplain\b/i, text: 'explain something to someone: Can you explain it to me? Explain this rule to me (не explain me).' },
  { id: 'wait', match: /\bwait/i, text: 'wait for: I\'m waiting for you (не waiting you).' },
  { id: 'listen', match: /\blisten/i, text: 'listen to: listen to music, listen to me (не listen music); без дополнения — просто Listen!' },
  { id: 'depend', match: /\bdepend|зависит/i, text: 'depend on: It depends on the weather (не depends from / of).' },
  { id: 'married', match: /married|marry|женат|замужем/i,
    text: 'be married to someone: I\'m married to Arman (не married with); get married (to someone) — пожениться; marry someone — без предлога: He married Aigul.' },
  { id: 'photo', match: /\bphoto|\bpicture|фото/i, text: 'take a photo / take a picture (не make a photo); in the photo — на фотографии (не on the photo).' },
  { id: 'internet', match: /internet|интернет/i, text: 'on the internet / online (не in the internet).' },
  { id: 'look', match: /\blook (after|for|at)\b/i, text: 'look after — присматривать, заботиться; look for — искать; look at — смотреть на.' },
  { id: 'age', match: /\d+ (лет|года|years)|мне \d+|have \d+ years|жастамын|жаста/i,
    text: 'Возраст — через be: I\'m 20 / I am twenty (years old); не I have 20 years.' },

  // ---------------------------------------------------------------- похожие слова
  { id: 'say-tell', match: /\bsay\b.*\btell\b|\btell\b.*\bsay\b|said me|told me hello/i,
    text: 'say — что сказали: say something (to someone), say hello, He said that…; tell — кому: tell someone something, tell a story, tell the truth, tell a lie, He told me that… Не He said me.' },
  { id: 'speak-talk', kk: "speak — тілде сөйлеу, ресмирек: speak English, speak to the manager; talk — әңгімелесу: talk to / with a friend, talk about the film. speak about және speak with — да дұрыс.",
    match: /\bspeak\b.*\btalk\b|\btalk\b.*\bspeak\b/i,
    text: 'speak — говорить на языке, выступать, официальнее: speak English, speak to the manager; talk — беседовать: talk to / with a friend, talk about the film. speak about и speak with — тоже верны.' },
  { id: 'make-do', match: /\bmake\b.*\bdo\b|\bdo\b.*\bmake\b/i,
    text: 'do — дела, работа, обязанности: do homework, do the dishes, do sport, do exercises; make — создать, получить результат: make a cake, make a decision, make a mistake, make friends, make money. Сочетания устойчивые — их учат парами.' },
  { id: 'borrow-lend', match: /\bborrow\b|\blend\b/i, text: 'borrow — взять взаймы (from): Can I borrow your pen? lend — дать взаймы (to): Can you lend me your pen?' },
  { id: 'miss-lose', kk: "miss — кешігіп қалу (I missed the bus), өткізіп алу (miss a lesson), сағыну (I miss you); lose — жоғалту (I lost my keys), ұтылу. «Мен сені сағындым» — I miss you (әлі бөлек болсаңдар); кездескенде — I missed you / I've missed you.",
    match: /\bmiss\b|\blose\b|\blost\b|скучаю|скучать|сағынд|опоздал на|потерял/i,
    text: 'miss — опоздать на (I missed the bus), пропустить (miss a lesson), скучать (I miss you; разговорно и I\'m missing you — тоже верно); lose — потерять (I lost my keys), проиграть. «Скучаю по тебе», «Мен сені сағындым» — I miss you (пока не вместе); при встрече — I missed you / I\'ve missed you.' },
  { id: 'fun-funny', match: /\bfun\b|\bfunny\b/i, text: 'fun — весело, приятно провести время: The party was fun; funny — смешной: a funny joke.' },
  { id: 'still-yet', match: /\bstill\b|\byet\b|\balready\b/i,
    text: 'already — уже (раньше, чем ждали): I\'ve already done it; yet — в вопросах «уже?» (Have you finished yet?) и в отрицаниях «ещё не» (I haven\'t finished yet), обычно в конце; still — всё ещё: I\'m still waiting.' },
  { id: 'see-look-watch', match: /\bwatch\b.*\b(see|look)\b|\b(see|look)\b.*\bwatch\b/i,
    text: 'see — видеть (само собой); look (at) — смотреть, направлять взгляд; watch — смотреть, наблюдать за движущимся, долго: watch TV, watch a film. see a film — сходить в кино, тоже верно.' },
  { id: 'job-work', match: /\bjob\b.*\bwork\b|\bwork\b.*\bjob\b/i, text: 'job — исчисляемое, конкретная должность: a job, two jobs; work — неисчисляемое, сама работа или место: I have a lot of work, I go to work (не a work в значении «должность»).' },
  { id: 'false-friends', kk: "Жалған достар: actually — шын мәнінде, негізінде (актуальный мағынасында емес — ол relevant); sympathetic — жанашыр; magazine — журнал (дүкен — shop, store); fabric — мата (фабрика — factory); accurate — дәл.",
    match: /actually|актуальн|sympathetic|симпатичн|magazine|магазин|fabric|accurate|аккуратн/i,
    text: 'Ложные друзья: actually — на самом деле, вообще-то (актуальный — relevant, up to date); sympathetic — сочувствующий, отзывчивый (симпатичный — nice, good-looking, cute); magazine — журнал (магазин — shop, store); fabric — ткань (фабрика — factory); accurate — точный (аккуратный — neat, tidy).' },
  { id: 'pretty', match: /\bpretty\b/i, text: 'pretty перед прилагательным или наречием — разговорное «довольно, весьма»: pretty good, pretty fast; pretty как прилагательное — милый, симпатичный.' },
  { id: 'learn-study', kk: "learn — үйрену, меңгеру: learn English, learn to swim; study — оқу, пәнмен айналысу: study at university, study for an exam. Қазір ағылшын тілін үйреніп жүрсең — I'm learning English / I'm studying English.",
    match: /\blearn\b|\bstudy\b|үйреніп|изучаю|учу английский/i,
    text: 'learn — выучить, овладеть: learn English, learn to swim; study — учиться, заниматься предметом: study at university, study for an exam. «Я изучаю английский» (сейчас) — I\'m learning English / I\'m studying English.' },

  // ---------------------------------------------------------------- перевод фраз
  { id: 'reschedule', match: /(перевед|перевод|перевести|по-английски|аудар|translate).*перенест|перенест.*(по-английски|перевед|перевод)|reschedul|postpone/i,
    text: '«Перенести урок»: reschedule my lesson (назначить новое время, нейтрально), move my lesson to Friday (разговорно, «передвинуть»), postpone the lesson (отложить на более позднее время, официальнее).' },
  { id: 'price', match: /сколько (это )?стоит|қанша тұрады|how much (is|does)/i, text: 'Цена: How much is it? / How much does it cost? / How much are they? (для нескольких вещей).' },
  { id: 'directions', match: /как пройти|как дойти|как добраться|the way to|get to the/i,
    text: 'Спросить дорогу: Excuse me, how do I get to the station? / Could you tell me the way to the station? (вежливее). Не How to go to station?' },
  { id: 'long-time', match: /давно (тебя |вас )?не вид|long time no see|in ages/i, text: '«Давно не виделись»: I haven\'t seen you for a long time / in ages; разговорно — Long time no see.' },
  { id: 'forward', match: /looking forward|look forward/i, text: 'look forward to + -ing: I\'m looking forward to seeing you / to hearing from you (to — предлог) — «с нетерпением жду».' },
  { id: 'give-up', match: /give up/i, text: 'give up — сдаваться; бросать (привычку): Don\'t give up! — Не сдавайся! give up smoking — бросить курить.' },
  { id: 'cup-of-tea', match: /cup of tea/i, text: 'not my cup of tea — идиома: «это не моё», «мне это не по душе»; не дословно про чай.' },
  { id: 'appetite', match: /аппетит|bon app|enjoy your meal|ас болсын/i, text: '«Приятного аппетита»: точного бытового аналога нет; говорят Enjoy your meal, заимствованное Bon appétit, разговорно Dig in!' },
  { id: 'time-ask', kk: "«Сағат неше?» — What time is it? / What's the time?; бейтаныс адамнан сыпайы — Do you have the time? (What hour is it? емес).",
    match: /сағат неше|который час|what time is it/i, text: '«Который час?» — What time is it? / What\'s the time?; вежливо незнакомцу — Do you have the time? (не What hour is it?).' },
  { id: 'take-care', kk: "Take care — қоштасқанда «Өзіңді күт», «Сау бол».",
    match: /take care/i, text: 'Take care — при прощании «береги себя», «всего доброго» (по-казахски — «Өзіңді күт», «Сау бол»).' },
  { id: 'name', kk: "«Менің атым Айгерим» — My name is Aigerim / I'm Aigerim, екеуі де дұрыс.",
    match: /менің атым|меня зовут|my name is/i, text: '«Меня зовут Айгерим» — My name is Aigerim / I\'m Aigerim, оба верны.' },
  { id: 'tired', kk: "I'm tired — «Мен шаршадым».",
    match: /i'?m tired|шаршадым|я устал/i, text: 'I\'m tired — «я устал(а)», по-казахски «Мен шаршадым».' },

  // ---------------------------------------------------------------- произношение
  { id: 'th', match: /\bth\b|\bthink\b|\bthis\b.*произнос|θ|ð/i,
    text: 'th: глухой [θ] (think, three) — кончик языка между зубами или у верхних зубов, выдох без голоса; звонкий [ð] (this, mother) — так же, но с голосом. Не «с», не «ф», не «з».' },
  { id: 'w', kk: "w [w]: еріндер «у» дегендей дөңгеленіп алға шығады да, бірден дауыстыға өтеді: water, we. Бұл «в» емес: тіс ерінге тимейді.",
    match: /«w»|\bw\b дыбыс|звук w|\bwater\b/i,
    text: 'w [w]: губы округлены и вытянуты, как для «у», и сразу переходят к гласному: water, we. Это не «в»: зубы губу не касаются.' },
  { id: 'wednesday', match: /wednesday/i, text: 'Wednesday — [ˈwenzdeɪ], «уэнздэй»: первая d (в Wed-) не читается, слогов два.' },
  { id: 'comfortable', match: /comfortable/i, text: 'comfortable — ударение на первом слоге: COMF-tuh-bl [ˈkʌmftəbl], обычно три слога: слог «for» почти пропадает.' },
]

// Термины по-казахски — для казахского ответа: без них в него шли русские «подлежащее», «3-я форма».
const KK_TERMS = 'Казахские термины и подписи для ответа (по-русски их не пиши): бастауыш — подлежащее, баяндауыш — сказуемое, етістік — глагол, көмекші етістік — вспомогательный глагол, зат есім — существительное, сын есім — прилагательное, үстеу — наречие, есімдік — местоимение, осы шақ / өткен шақ / келер шақ — настоящее / прошедшее / будущее время, етістіктің үшінші формасы (V3) — третья форма, жекеше / көпше түр — единственное / множественное число, саналатын / саналмайтын — исчисляемое / неисчисляемое, жақ — лицо (үшінші жақ — 3-е лицо), сөз тәртібі — порядок слов, болымсыз сөйлем — отрицание, сұраулы сөйлем — вопрос, екпін — ударение, айтылу — произношение. Подписи: «Негізгі нұсқа», «Басқа нұсқа», «Себебі», «Жиі қате», «Түзетілген мәтін», «Тексеру сұрағы».'

/** Вопрос об английском (правило, перевод, слово, проверка, произношение), а не о сайте. */
export function isEnglishQuestion(question) {
  const q = String(question || '')
  return LANG_Q.test(q) || GRAMMAR_TERMS.test(q) || latinWords(q) >= 1
}

/** Совпавшие записи справки, по порядку списка, не больше MAX_ENTRIES; kk — только с казахским текстом. */
export function matchRef(question, { kk = false } = {}) {
  const q = String(question || '')
  return GRAMMAR_REF.filter((e) => (!kk || e.kk) && e.match.test(q)).slice(0, MAX_ENTRIES)
}

/**
 * Строка справки к вопросу ученика или null. answerLang — язык ответа: для казахского добавляется словарь терминов
 * (даже без совпавших записей — термины нужны любому казахскому разбору).
 */
export function grammarRefFor(question, { answerLang = 'ru' } = {}) {
  if (!isEnglishQuestion(question)) return null
  const kk = answerLang === 'kk'
  // Казахскому ответу — только записи с казахским текстом: русский текст справки модель переносила в казахский ответ
  // («исполнитель», «неправильный глагол», «на самом деле» — эталонный набор 08.11.2026).
  const entries = matchRef(question, { kk })
  if (!entries.length && !kk) return null
  const lines = []
  if (entries.length) {
    lines.push(kk
      ? 'Мектеп анықтамасы — жауапты осымен тексер, жадыңа сенбе; мұнда жоқты әдеттегідей түсіндір, бірақ дұрысты қате деме:'
      : 'Справка школы по теме вопроса — сверяй ответ с ней, а не с памятью; чего в ней нет, объясняй как обычно, но верное не объявляй ошибкой:')
    for (const e of entries) lines.push(`- ${kk ? e.kk : e.text}`)
  }
  if (kk) lines.push(KK_TERMS)
  return lines.join('\n')
}
