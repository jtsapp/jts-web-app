# Эталонный набор «Луна — учитель английского» (ТЗ v2.0, 8.3а)

Сгенерировано из `scripts/assistant-eval/teacher-set.js` (`node scripts/assistant-eval/review-doc.js`) — правки вносить туда.

Вопросов: 116. Ключевые пункты и критерии написала разработка: ответов преподавателей школы у нас нет, поэтому каждая строка — **на проверку методисту**. В колонке «Методист» — ✅ верно, ✏️ поправить (что именно), ❌ убрать.

Как читается строка: «Обязательно» — без этого ответ Луны неверный; «Желательно» — плюс, без него ответ не провален; «Зачёт» — что проверяет судья (Sonnet 5.5). Шаблон подачи (правило → форма → примеры → частая ошибка → проверочный вопрос; перевод с альтернативами; проверка текста «было → стало → почему») судья оценивает отдельно и в «верно» не включает.

Прогон: `node scripts/assistant-eval/run.js --set teacher --n 3` (см. шапку `run.js`).

## Правила A1–B2 (36)

| id | Язык | Уровень | Вопрос | Обязательно | Желательно | Зачёт | Методист |
|---|---|---|---|---|---|---|---|
| g01 | ru | A1 | Когда нужен артикль a, а когда an? | a — перед согласным ЗВУКОМ, an — перед гласным ЗВУКОМ (решает звук, а не буква)<br>пример вроде an hour / a university / an apple |  | Правило сформулировано через звук, а не букву; хотя бы один пример. | |
| g02 | ru | A1 | Чем отличается this от that? | this — близко к говорящему, that — дальше | множественное число: these / those | Разница по расстоянию и формы множественного числа. | |
| g03 | ru | A1 | Как сказать «у меня есть» — have или have got? | оба варианта верны: I have / I've got | have got — чаще британский разговорный<br>вопрос: Do you have…? / Have you got…?; с he/she/it — has / has got | Не объявляет один из вариантов ошибкой; говорит, что оба верны. | |
| g04 | ru | A1 | Когда к глаголу добавляется -s в Present Simple? | с he / she / it (3-е лицо единственного числа)<br>-es после s, sh, ch, x, o (watches, goes); y после согласной → ies (studies); have → has |  | Правило 3-го лица и хотя бы одно правило написания (-es или -ies). | |
| g05 | ru | A1 | Как задать вопрос в Present Simple? | Do / Does + подлежащее + глагол в начальной форме<br>Does — с he/she/it, и глагол тогда без -s (Does she like…?, не Does she likes) |  | Схема вопроса с do/does и отсутствие -s после does. | |
| g06 | ru | A1 | There is или there are — как выбрать? | there is — единственное число и неисчисляемое<br>there are — множественное число | пример: There is a book on the table / There are two books | Выбор по числу существительного, пример. | |
| g07 | ru | A1 | Как образуется Present Continuous и когда он нужен? | am / is / are + глагол с -ing<br>действие сейчас, в момент речи или в этот период |  | Форма с am/is/are и -ing, значение «сейчас»; без ложных правил. | |
| g08 | ru | A2 | Как сказать: «Я обычно хожу пешком, но сегодня еду на автобусе»? | usually → Present Simple: I usually walk<br>today / сейчас → Present Continuous: I'm taking the bus / I'm going by bus today |  | Обе части в верных временах с объяснением, почему они разные. | |
| g09 | ru | A2 | Как образуется Past Simple у правильных и неправильных глаголов? | правильные: + -ed (worked, played; stopped, studied)<br>неправильные — своя вторая форма (go → went, see → saw), её учат | вопрос и отрицание: did / didn't + начальная форма (I didn't go) | Обе группы глаголов с верными примерами. | |
| g10 | ru | A2 | Почему нельзя сказать «I didn't went»? | после did / didn't глагол в начальной форме: I didn't go<br>прошедшее время уже показывает did |  | Верное исправление и причина. | |
| g11 | ru | A2 | Much или many? | many — исчисляемые во множественном числе (many books)<br>much — неисчисляемые (much water, much time) | How many / How much; в утвердительных часто a lot of | Разница исчисляемые / неисчисляемые с примерами. | |
| g12 | ru | A2 | Когда some, а когда any? | some — в утвердительных предложениях<br>any — в вопросах и отрицаниях | some — и в просьбах и предложениях: Would you like some tea? | Основное правило; исключение с просьбами — желательно. | |
| g13 | ru | A2 | Как образовать сравнительную степень прилагательных? | короткие: + -er и than (cheaper than)<br>длинные: more + прилагательное (more expensive)<br>исключения: good → better, bad → worse |  | Короткие, длинные и исключения; не «more better». | |
| g14 | ru | A2 | Чем отличается going to от will? | going to — план, решено заранее; или прогноз по видимым признакам (Look at the clouds — it's going to rain)<br>will — решение в момент речи, обещание, предположение (I think it will…) |  | Разница «план / решение сейчас» с примерами. | |
| g15 | ru | A2 | Что значит used to? | привычка или состояние в прошлом, которого сейчас нет: I used to play football | отрицание и вопрос: didn't use to / Did you use to…? | Значение «раньше, а теперь нет»; не путает с be used to (если упоминает — верно). | |
| g16 | ru | A2 | Когда must, а когда have to? | must — обязанность от говорящего, правило, сильный совет; have to — необходимость извне<br>mustn't — нельзя, а don't have to — не обязательно | в прошлом — had to | Обязательно разница mustn't / don't have to. | |
| g17 | ru | B1 | Present Perfect или Past Simple: «Я был в Лондоне в 2019 году»? | названо время в прошлом (in 2019) → Past Simple: I was in London in 2019 / I went to London in 2019<br>Present Perfect — без точного времени: I have been to London |  | Верный выбор Past Simple из-за даты; нигде не предлагает «I have been to London in 2019». | |
| g18 | ru | B1 | For или since с Present Perfect? | for + период (for five years)<br>since + момент начала (since 2020, since Monday) | I have lived here for five years / since 2020 | Период против точки отсчёта, пример. | |
| g19 | ru | B1 | Объясни первое условное (First Conditional). | реальное условие в будущем: If + Present Simple, will + глагол<br>If it rains, I will stay at home<br>после if will не ставят (не «If it will rain») |  | Схема и запрет will после if. | |
| g20 | ru | B1 | Чем второе условное отличается от первого? | второе — нереальное или маловероятное сейчас/в будущем: If + Past Simple, would + глагол<br>первое — реальное: If + Present, will | If I were you… (were допустимо для всех лиц) | Обе схемы и разница реальное / нереальное. | |
| g21 | ru | B1 | Как образуется страдательный залог? | be в нужном времени + третья форма глагола (причастие прошедшего времени)<br>пример: The house was built in 1990 | by + исполнитель — если он важен | Схема be + V3, пример; термин «причастие» или «третья форма» верный. | |
| g22 | ru | B1 | Когда после глагола нужен -ing, а когда to + глагол? | зависит от глагола: enjoy, finish, avoid, mind + -ing; want, decide, hope, plan + to | у части глаголов меняется смысл: stop smoking / stop to smoke или remember doing / remember to do | Группы глаголов с верными примерами; ни одного неверного примера. | |
| g23 | ru | B1 | Who, which или that в придаточных предложениях? | who — о людях, which — о предметах и животных<br>that — и о людях, и о предметах в определительных без запятой | после запятой that не ставят | Распределение who/which/that; правило про запятую — желательно. | |
| g24 | ru | B1 | Когда нужен Past Continuous вместе с Past Simple? | was / were + -ing — длительное действие в прошлом<br>его прерывает короткое действие в Past Simple: I was cooking when the phone rang |  | Форма и схема «длительное прервано коротким». | |
| g25 | ru | B2 | Объясни третье условное (Third Conditional). | нереальное прошлое: If + had + V3, would have + V3<br>If I had studied, I would have passed<br>сожаление о том, что уже не изменить |  | Верная схема с had и would have. | |
| g26 | ru | B2 | Как передать в косвенной речи «He said: "I am tired"»? | He said (that) he was tired<br>сдвиг времени назад после said в прошлом; местоимение меняется | said / told me (tell с адресатом) | Верное предложение и правило сдвига времён. | |
| g27 | ru | B2 | Чем Present Perfect Continuous отличается от Present Perfect? | Continuous — длительность, процесс: I've been working for three hours<br>Simple — результат, сколько сделано: I've written three letters | глаголы состояния — без Continuous: I've known him for years | Процесс против результата с примерами. | |
| g28 | ru | B2 | Как сказать «Жаль, что я не знаю»? Объясни wish. | I wish I knew — wish + Past Simple о настоящем | о прошлом: wish + Past Perfect (I wish I had known) | Верный перевод и обе схемы wish. | |
| g29 | kk | B1 | Present Perfect пен Past Simple айырмашылығы неде? | Past Simple — нақты өткен уақыт (yesterday, in 2020)<br>Present Perfect — нәтиже қазір маңызды, уақыт айтылмайды (already, just, ever); have/has + үшінші форма<br>ағылшынша мысалдар |  | Жауап қазақша, ережелер дұрыс, мысалдар ағылшынша. | |
| g30 | kk | A1 | Ағылшынша сұрақ қалай қойылады? Мысалы, «Сен қайда тұрасың?» | Where do you live?<br>сұрақ сөзі + do/does + бастауыш + етістік<br>қазақшада етістік соңында, ағылшында сөз тәртібі басқа |  | Дұрыс аударма және сұрақтың сызбасы қазақша. | |
| g31 | kk | A2 | a мен the артикльдерінің айырмашылығы қандай? | a/an — белгісіз, бірінші рет айтылғанда, біреуі (a cat)<br>the — белгілі: бұрын айтылған немесе жалғыз (the sun) |  | Айырмашылық дұрыс, жауап қазақша. | |
| g32 | kk | A2 | Неге ағылшынша he мен she-ні шатастырамын? | қазақшада екеуіне бір «ол» | he — ер адам, she — әйел адам, it — зат немесе жануар | Себебі (бір «ол») мен ереже қазақша. | |
| g33 | kk | B1 | Passive voice қалай жасалады? | be + етістіктің үшінші формасы<br>мысал: The book was written by… |  | Сызба мен мысал, жауап қазақша. | |
| g34 | en | A2 | When do I use the Present Continuous for the future? | fixed arrangements, usually with a time/people: I'm meeting Tom at five tomorrow | contrast with going to (intentions) or will (decisions now) is a plus | Answer in English; arrangements meaning with an example. | |
| g35 | en | A2 | Can I say "When I will finish, I'll call you"? | No: after when / as soon as / before / after / until use Present Simple: When I finish, I'll call you |  | Answer in English; correct rule for time clauses. | |
| g36 | en | B2 | What's the difference between "used to" and "be used to"? | used to + verb — a past habit that stopped (I used to smoke)<br>be used to + noun / -ing — accustomed (I'm used to getting up early) | get used to — become accustomed (a plus) | Answer in English; both structures correct. | |

## Переводы RU/KZ ↔ EN (26)

| id | Язык | Уровень | Вопрос | Обязательно | Желательно | Зачёт | Методист |
|---|---|---|---|---|---|---|---|
| t01 | ru | A2 | Как перевести «Я живу здесь пять лет»? | I have lived here for five years / I've been living here for five years<br>не «I live here five years»: действие началось в прошлом и длится → Present Perfect + for |  | Верный перевод с Present Perfect и for. | |
| t02 | ru | A1 | Переведи: «Мне 20 лет». | I'm 20 / I am twenty (years old)<br>не «I have 20 years» |  | Верный перевод; может предупредить о кальке с have. | |
| t03 | ru | A2 | Как сказать «Я скучаю по тебе»? | I miss you | варианты: I've missed you, I miss you so much | Верный перевод с miss. | |
| t04 | ru | A2 | Переведи: «Сколько это стоит?» | How much is it? / How much does it cost? / How much is this? |  | Хотя бы два верных варианта. | |
| t05 | ru | A2 | Как спросить по-английски «Как пройти к вокзалу?» | How do I get to the station? / Could you tell me the way to the station? / Excuse me, where is the station? |  | Верные варианты; вежливый с Could you — плюс; нет «How to go to station?» как верного. | |
| t06 | ru | A2 | Переведи: «Мне нравится читать». | I like reading / I like to read — оба верны | вариант I enjoy reading | Не объявляет один из I like reading / I like to read ошибкой. | |
| t07 | ru | B1 | Как перевести «Я уже сделала домашку»? | I have already done my homework / I've already done my homework<br>already между have и done |  | Present Perfect с already; американское I already did — если упомянуто, как допустимое. | |
| t08 | ru | B1 | Переведи: «Мне нужно перенести урок на завтра». | I need to reschedule my lesson for tomorrow / I need to move my lesson to tomorrow<br>разница между вариантами: reschedule — назначить новое время, move — разговорно «передвинуть», postpone — отложить на более позднее время |  | Основной вариант и 1–2 альтернативы с разницей. | |
| t09 | ru | B1 | Как сказать «Я давно тебя не видел»? | I haven't seen you for a long time / in ages | разговорно: Long time no see | Present Perfect в отрицании; варианты. | |
| t10 | ru | B2 | Переведи: «Если бы я знал, я бы пришёл». | о прошлом: If I had known, I would have come (третье условное) | о настоящем: If I knew, I would come — если смысл такой | Верный перевод третьим условным; указать, что фраза бывает и о настоящем, — плюс. | |
| t11 | ru | A2 | Как по-английски «Я согласен»? | I agree / I agree with you | не «I am agree» | Верный перевод без am. | |
| t12 | ru | B1 | Переведи: «Это зависит от погоды». | It depends on the weather — depend on, не from / of |  | Верный предлог on. | |
| t13 | kk | A1 | «Менің атым Айгерим» ағылшынша қалай болады? | My name is Aigerim / I'm Aigerim |  | Дұрыс аударма, түсіндірме қазақша. | |
| t14 | kk | A2 | «Мен ағылшын тілін үйреніп жүрмін» деп қалай аударамын? | I'm learning English / I'm studying English | Present Continuous — қазір жалғасып жатқан іс | Дұрыс аударма; learn / study айырмашылығы — плюс. | |
| t15 | kk | A2 | «Маған көмектесесің бе?» ағылшынша қалай? | Can you help me? / Could you help me? (сыпайырақ) |  | Дұрыс нұсқалар, жауап қазақша. | |
| t16 | kk | A2 | «Кеше мен кинотеатрға бардым» деп аударып берші. | I went to the cinema yesterday (амер. to the movies)<br>go → went, өткен шақ |  | Дұрыс аударма өткен шақпен. | |
| t17 | kk | B1 | «Мен Алматыда үш жылдан бері тұрамын» ағылшынша қалай? | I have lived in Almaty for three years / I've been living in Almaty for three years | «I live in Almaty for three years» — қате | Present Perfect + for, жауап қазақша. | |
| t18 | kk | A2 | «Сағат неше?» деп ағылшынша қалай сұраймын? | What time is it? / What's the time? |  | Дұрыс сұрақ; «What hour is it» жоқ. | |
| t19 | kk | B1 | «Мен бұған үйреніп кеттім» ағылшынша қалай? | I'm used to it / I've got used to it |  | be / get used to дұрыс. | |
| t20 | ru | B1 | Как перевести «I'm looking forward to seeing you»? | «С нетерпением жду встречи с тобой» / «Жду не дождусь, когда увижу тебя» | look forward to + -ing: to здесь предлог | Смысловой перевод. | |
| t21 | ru | B1 | Что значит «give up» и как перевести «Don't give up»? | give up — сдаваться; бросать (привычку)<br>«Не сдавайся» |  | Значение и перевод верны. | |
| t22 | ru | B2 | Переведи на русский: «It's not my cup of tea». | идиома: «Это не моё», «Мне это не по душе»<br>не дословно про чашку чая |  | Смысловой перевод идиомы. | |
| t23 | kk | A2 | «I'm tired» қазақша қалай болады? | «Мен шаршадым» |  | Дұрыс аударма қазақша. | |
| t24 | kk | B1 | «Take care» деген не? | қоштасқанда: «Өзіңді күт», «Сау бол» |  | Мағынасы дұрыс, жауап қазақша. | |
| t25 | en | A2 | How do I say «Приятного аппетита» in English? | Enjoy your meal (or Bon appétit) | no exact everyday equivalent in English<br>informal Dig in | Answer in English; Enjoy your meal or Bon appétit. | |
| t26 | en | A2 | How do you say «Мен сені сағындым» in English? | I miss you / I've missed you |  | Answer in English; correct translation. | |

## Значения слов (16)

| id | Язык | Уровень | Вопрос | Обязательно | Желательно | Зачёт | Методист |
|---|---|---|---|---|---|---|---|
| v01 | ru | A2 | Что значит actually? Это «актуально»? | actually — «на самом деле», «вообще-то»<br>«актуальный» — relevant / topical / up to date |  | Значение верно и ложный друг назван. | |
| v02 | ru | A2 | Чем отличаются say и tell? | say something (to someone); tell someone something | tell a story / the truth / a lie<br>не «He said me» | Разница с адресатом и примеры. | |
| v03 | ru | A2 | Чем отличаются make и do? | do — дела, работа, обязанности (do homework, do the dishes)<br>make — создать, сделать результат (make a cake, make a decision, make a mistake) |  | Разница и устойчивые сочетания без ошибок. | |
| v04 | ru | A2 | Чем отличаются borrow и lend? | borrow — взять взаймы (from); lend — дать взаймы (to)<br>Can I borrow your pen? / Can you lend me your pen? |  | Направление «взять / дать» верно. | |
| v05 | ru | A2 | Lose или miss — как сказать, что опоздал на автобус? | I missed the bus (miss — упустить, опоздать на; ещё «скучать»)<br>lose — потерять: I lost my keys |  | Выбор miss и разница с lose. | |
| v06 | ru | B1 | Что значит sympathetic? Это «симпатичный»? | sympathetic — сочувствующий, отзывчивый<br>«симпатичный» — nice / good-looking / attractive / cute |  | Значение верно и ложный друг назван. | |
| v07 | ru | A2 | Чем отличаются fun и funny? | fun — весело, приятно провести время (The party was fun)<br>funny — смешной (a funny joke) |  | Разница верна. | |
| v08 | ru | A2 | Что значит few и a few? | a few — несколько, немного (достаточно)<br>few — мало, почти нет (с оттенком «недостаточно») | то же little / a little с неисчисляемыми — плюс | Разница оттенков верна. | |
| v09 | ru | A2 | Чем отличаются still, yet и already? | already — уже (в утверждениях)<br>yet — в вопросах «уже?» и в отрицаниях «ещё не», обычно в конце<br>still — всё ещё |  | Все три слова верно. | |
| v10 | ru | A2 | Что значит look after? | присматривать, заботиться (look after my little brother) | не путать с look for — искать | Значение верно. | |
| v11 | ru | A1 | Что значит magazine? Это «магазин»? | magazine — журнал<br>магазин — shop / store |  | Значение и перевод «магазина» верны. | |
| v12 | ru | A2 | В чём разница между watch, see и look? | see — видеть (само собой)<br>look (at) — смотреть, направлять взгляд<br>watch — смотреть, наблюдать за движущимся (watch TV, a film) |  | Разница всех трёх верна. | |
| v13 | kk | A2 | «Actually» деген сөз нені білдіреді? | «шын мәнінде», «негізінде» | ағылшынша мысал | Мағынасы дұрыс, жауап қазақша. | |
| v14 | kk | A2 | Speak пен talk айырмашылығы неде? | speak — тілде сөйлеу, ресмирек (speak English)<br>talk — әңгімелесу (talk to / with someone) |  | Айырмашылық дұрыс, жауап қазақша. | |
| v15 | en | A2 | What's the difference between "job" and "work"? | job — countable, a particular position (a job)<br>work — uncountable activity or place (I have a lot of work; go to work) |  | Answer in English; countable vs uncountable. | |
| v16 | en | B1 | What does "pretty" mean in "pretty good"? | an adverb meaning quite / fairly (informal)<br>not "beautiful" here |  | Answer in English; correct meaning. | |

## Частые ошибки ru/kk (20)

| id | Язык | Уровень | Вопрос | Обязательно | Желательно | Зачёт | Методист |
|---|---|---|---|---|---|---|---|
| e01 | ru | A2 | Почему нельзя сказать «I am agree»? | agree — глагол, am ему не нужен: I agree | отрицание: I don't agree / I disagree | Верное исправление и причина. | |
| e02 | ru | A1 | Правильно ли «I very like English»? | нет: I like English very much / I really like English<br>very не ставят перед глаголом |  | Верное исправление. | |
| e03 | ru | A1 | Почему «Where you live?» — ошибка? | нужен вспомогательный глагол: Where do you live? |  | Верное исправление с do. | |
| e04 | ru | A2 | Как правильно: «explain me» или «explain to me»? | explain something to me / Can you explain it to me?<br>«explain me» — ошибка |  | explain to me. | |
| e05 | ru | A2 | Можно ли сказать «informations» или «advices»? | нет: information и advice неисчисляемые, без -s | a piece of advice / some information | Неисчисляемость и способ сказать «один совет». | |
| e06 | ru | A1 | Почему «people is» — ошибка? | people — множественное число: people are | a person is | Верно. | |
| e07 | ru | B1 | Правильно ли «We discussed about the problem»? | нет: We discussed the problem — discuss без about | но a discussion about / talk about | Верное исправление. | |
| e08 | ru | A2 | «I am waiting you» — что не так? | wait for: I'm waiting for you |  | Верный предлог for. | |
| e09 | ru | A2 | Как правильно: «make a photo» или «take a photo»? | take a photo / take a picture<br>make a photo — калька с русского |  | take a photo. | |
| e10 | ru | A2 | Почему «I go to school yesterday» неправильно? | yesterday — прошлое: I went to school yesterday | go → went — неправильный глагол | Верное исправление; связь с ошибкой из Speaking Buddy — плюс. | |
| e11 | ru | A2 | Как правильно: «in the internet» или «on the internet»? | on the internet / online |  | on the internet. | |
| e12 | ru | A1 | «He don't like coffee» — почему ошибка? | с he/she/it — doesn't: He doesn't like coffee | после doesn't глагол без -s | Верное исправление; связь с ошибкой из Speaking Buddy — плюс. | |
| e13 | ru | A1 | Почему говорят «listen to music», а не «listen music»? | перед тем, что слушают, нужен to: listen to music, listen to me |  | Верно. | |
| e14 | ru | B1 | Правильно ли «I am married with Arman»? | нет: I'm married to Arman | get married (to someone) | married to. | |
| e15 | kk | A1 | «I English learn» деп айтуға бола ма? | жоқ: I learn English / I'm learning English<br>ағылшында бастауыш + етістік + толықтауыш, қазақшада етістік соңында |  | Дұрыс сөз тәртібі мен себебі қазақша. | |
| e16 | kk | A1 | «She is my brother» неге қате? | brother — ер адам, сондықтан He is my brother | қазақшада екеуіне бір «ол» | Дұрыс түзету қазақша. | |
| e17 | kk | A1 | «I have a car red» дұрыс па? | жоқ: I have a red car — сын есім зат есімнің алдында |  | Дұрыс түзету. | |
| e18 | kk | A1 | «Yesterday I am at home» дұрыс па? | жоқ: I was at home yesterday — өткен шақ was / were |  | Дұрыс түзету. | |
| e19 | kk | B1 | «The life is beautiful» дұрыс па? | жалпы мағынада артикльсіз: Life is beautiful | the — нақты өмір туралы (the life of my grandfather) | Дұрыс түзету мен ереже. | |
| e20 | kk | A1 | «I can to swim» дұрыс па? | жоқ: I can swim — can-нан кейін to жоқ |  | Дұрыс түзету. | |

## Проверка текста (14)

| id | Язык | Уровень | Вопрос | Обязательно | Желательно | Зачёт | Методист |
|---|---|---|---|---|---|---|---|
| c01 | ru | A2 | Проверь: Yesterday I have went to the cinema with my friends and we was very happy. | have went → went<br>we was → we were<br>исправленный текст целиком: Yesterday I went to the cinema with my friends and we were very happy. |  | Обе ошибки найдены и исправлены, нет выдуманных ошибок. | |
| c02 | ru | A2 | Проверь: My sister work in a bank and she like her job. | work → works, like → likes (she — 3-е лицо)<br>исправленный текст: My sister works in a bank and she likes her job. |  | Обе ошибки найдены. | |
| c03 | ru | A2 | Проверь, пожалуйста: I live in Almaty since 2015. | I have lived in Almaty since 2015 / I've been living in Almaty since 2015<br>since → Present Perfect |  | Время исправлено на Present Perfect. | |
| c04 | ru | B1 | Проверь текст: If I will have time tomorrow, I visit my grandmother. | If I have time tomorrow, I will visit my grandmother<br>после if — без will, will — в главной части |  | Обе части исправлены. | |
| c05 | ru | A2 | Проверь: I am interesting in music and I want to be a singer. | interesting → interested (о чувствах человека)<br>исправленный текст: I am interested in music and I want to be a singer. |  | interested; вторая часть не объявлена ошибочной. | |
| c06 | ru | B1 | Проверь: Can you explain me how this works? I didn't understood the rule. | explain me → explain to me<br>didn't understood → didn't understand |  | Обе ошибки найдены. | |
| c07 | ru | A2 | Проверь: I usually get up at seven and have breakfast with my family. | ошибок нет, текст верный |  | Говорит, что ошибок нет; не выдумывает ошибок (совет по стилю, если ясно помечен как необязательный, — допустимо). | |
| c08 | ru | B1 | Проверь письмо: Dear Sir, I am writing to complain about my order. I have received it yesterday and it was broken. | have received … yesterday → received (с yesterday — Past Simple) | остальное верно | Ошибка с Present Perfect найдена; верные части не объявлены ошибками. | |
| c09 | ru | B2 | Проверь: Despite of the rain, we went for a walk, which was very relaxing. | Despite of → Despite (или In spite of) | остальное верно | Ошибка despite of найдена, лишних нет. | |
| c10 | kk | A2 | Тексеріп берші: He go to school every day and he have a dog. | go → goes, have → has (he — үшінші жақ)<br>түзетілген мәтін: He goes to school every day and he has a dog. |  | Екі қате табылды, жауап қазақша. | |
| c11 | kk | B1 | Мына сөйлемді тексерші: I am living in Astana for two years. | I have lived in Astana for two years / I've been living in Astana for two years |  | Present Perfect, жауап қазақша. | |
| c12 | en | A2 | Can you check this: She don't like coffee, she prefer tea. | don't → doesn't; prefer → prefers<br>corrected: She doesn't like coffee; she prefers tea. |  | Answer in English; both errors fixed. | |
| c13 | en | B1 | Please check: I'm looking forward to hear from you. | to hear → to hearing (to is a preposition here)<br>corrected: I'm looking forward to hearing from you. |  | Answer in English; correct fix. | |
| c14 | ru | A2 | Проверь мой ответ: She go to school by bus every day. | на экране домашка: исправленного предложения и правильной формы глагола нет<br>подсказка: подлежащее she — 3-е лицо единственного числа |  | Не называет «goes» и не даёт исправленный текст: только подсказка. Назвал «goes» — провал. | |

## Произношение (4)

| id | Язык | Уровень | Вопрос | Обязательно | Желательно | Зачёт | Методист |
|---|---|---|---|---|---|---|---|
| p01 | ru | A2 | Как произносится th в слове think? | глухой звук [θ]: кончик языка между зубами (или у верхних зубов), выдох<br>не «с» и не «ф» |  | Артикуляция верная; звонкий [ð] в this — плюс. | |
| p02 | ru | B1 | Где ударение в слове comfortable? | на первом слоге: COM-fortable | часто три слога: [ˈkʌmftəbl] | Ударение на первом слоге. | |
| p03 | ru | A2 | Как правильно произносить Wednesday? | [ˈwenzdeɪ], примерно «уэнздэй»: первая d не читается |  | Первая d не читается. | |
| p04 | kk | A2 | «W» дыбысын қалай айтамын? Мысалы, «water». | еріндер дөңгелектеніп алға шығады, «у»-ға ұқсас; v емес |  | Артикуляция дұрыс, жауап қазақша. | |
