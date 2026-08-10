/* Собрано scripts/extract-course-lessons.js из курс-файла уровня. */
(function(){
/* Данные уровня приходят от приложения (см. src/learning/CourseLesson.jsx). */
const UNITS=window.__JC_UNITS||[];
const LESSONS=window.__JC_LESSONS||{};
const REVIEWS=window.__JC_REVIEWS||{};
const AUDIO_B64={};
function JCROOT(){ return document.querySelector('.jc')||document.body; }
const DICT={
/* ---- Units 11-12 vocabulary ---- */
"accountant":["əˈkaʊntənt","a person whose job is to look after the money and numbers of a business","бухгалтер","бухгалтер","Tom Baker, an accountant, moved four times in six years."],
"judge":["dʒʌdʒ","a person who decides cases in a court of law","судья","судья","Judges have worked in the same court for twenty or thirty years."],
"inventor":["ɪnˈventə","a person who makes or designs something completely new","өнертапқыш","изобретатель","An inventor can work for years before anything works."],
"client":["ˈklaɪənt","a person or company that pays you for professional advice or a service","клиент","клиент","The clients know me. That matters more than I thought."],
"customer":["ˈkʌstəmə","a person who buys goods or services from a shop or company","сатып алушы","покупатель","Every customer in the shop gets a free coffee on Fridays."],
"staff":["stɑːf","all the people who work for one company or organization","қызметкерлер","персонал, сотрудники","The office is noisy, but the staff are good."],
"office":["ˈɒfɪs","a room or building where people work at desks","кеңсе","офис","I really don't like the office where I work."],
"open-plan":["ˌəʊpən ˈplæn","(of an office) one large room, with no walls between the desks","ашық жоспарлы","открытой планировки","So why do millions of us work in open-plan offices?"],
"building site":["ˈbɪldɪŋ saɪt","the place where a building is being built","құрылыс алаңы","стройплощадка","A man who started work on a building site at eighteen…"],
"court":["kɔːt","the place where a judge decides legal cases","сот","суд","The case will be heard in court next Tuesday."],
"construction":["kənˈstrʌkʃn","the industry and the work of building roads, houses and offices","құрылыс","строительство","In construction and in sales the numbers are much lower."],
"health care":["ˈhelθ keə","the service of looking after people's health: hospitals, doctors and nurses","денсаулық сақтау","здравоохранение","Nurses stay in health care even when they move hospital."],
"profession":["prəˈfeʃn","a job that needs long training and a formal qualification","кәсіп","профессия","Most people chose one profession and stayed in it."],
"business":["ˈbɪznəs","a company; also the work of buying and selling","бизнес","компания, дело","Now I have been with this business for eight years."],
"employer":["ɪmˈplɔɪə","a person or company that pays other people to work","жұмыс беруші","работодатель","The average worker stays with one employer for about five years."],
"survey":["ˈsɜːveɪ","a set of questions asked to many people to find something out","сауалнама","опрос","One survey found that a nurse works in the profession for eleven years."],
"full-time":["ˌfʊl ˈtaɪm","working the whole normal working week","толық жұмыс күні","полная занятость","He is full-time, and the day-to-day work changes every week."],
"part-time":["ˌpɑːt ˈtaɪm","working only some of the normal working hours","ішінара жұмыс","частичная занятость","She has worked part-time since her son was born."],
"day-to-day":["ˌdeɪ tə ˈdeɪ","happening every day as a normal part of the job","күнделікті","повседневный","We run the day-to-day business of the court."],
"productivity":["ˌprɒdʌkˈtɪvəti","how much work gets done in the time available","өнімділік","производительность","Noise in open-plan offices can reduce productivity by 66%."],
"zone":["zəʊn","an area kept for one particular purpose","аймақ","зона","Desks were organized into work zones of different sizes."],
"in charge of":["ɪn ˈtʃɑːdʒ əv","responsible for something, or for other people","жауапты","ответственный за","If you manage a team, you are in charge of the team."],
"paperwork":["ˈpeɪpəwɜːk","the letters, forms and records that a job needs","қағаз жұмысы","бумажная работа","I also do a lot of paperwork."],
"recruit":["rɪˈkruːt","to find and employ new people","жалдау","нанимать, набирать","One of my main roles is to recruit and train new staff."],
"report":["rɪˈpɔːt","a written account of something that has happened","есеп","отчёт","I write a report on food sales at the end of every evening."],
"entertain":["ˌentəˈteɪn","to take clients out and look after them socially","қонақ күту","принимать, развлекать","I also entertain clients a lot."],
"enquiry":["ɪnˈkwaɪəri","a question you send to a company to get information","сұраныс","запрос, обращение","We answer phone enquiries and deal with emails."],
"candidate":["ˈkændɪdət","a person who is applying for a job","үміткер","кандидат","It is harder to train a new candidate."],
"hybrid":["ˈhaɪbrɪd","partly at home and partly in the office","гибридті","гибридный","She has led a hybrid team since 2020."],
"flexible":["ˈfleksəbl","able to change easily to suit the situation","икемді","гибкий","Their week is more flexible."],
"in a hurry":["ɪn ə ˈhʌri","with very little time","асығыс","в спешке","They are less often in a hurry."],
"in a mess":["ɪn ə ˈmes","untidy, or not organized","ретсіз","в беспорядке","If your desk is in a mess, is it tidy?"],
"in detail":["ɪn ˈdiːteɪl","with all the small parts included","егжей-тегжейлі","подробно","Somebody has to explain in detail what everyone is doing."],
"in the middle":["ɪn ðə ˈmɪdl","while something else is still going on","ортасында","посередине","She called me in the middle of a meeting."],
"in trouble":["ɪn ˈtrʌbl","in a situation where someone is angry with you","қиындықта","в неприятностях","If you are in trouble with your boss, is he pleased with you?"],
"reference":["ˈrefrəns","a person who will tell an employer that you are good at your job","ұсыныс хат","рекомендация","References: available on request."],
"motivated":["ˈməʊtɪveɪtɪd","wanting to work hard because you care about the result","ынталы","мотивированный","A motivated candidate says why, not just what."],
"team player":["ˈtiːm ˌpleɪə","someone who works well with other people","командалық ойыншы","командный игрок","Everybody writes team player. Almost nobody proves it."],
"presentation":["ˌpreznˈteɪʃn","a short talk you give to a group of people","презентация","презентация, выступление","I often have to give presentations at the meetings."],
"politics":["ˈpɒlətɪks","the activity of governing a country, and the ideas people hold about it","саясат","политика","Never open with politics, money or your last boss."],
"tattoo":["təˈtuː","a picture or word marked permanently on the skin","татуировка","татуировка","If you had a tattoo, what would it say?"],
"arm wrestle":["ˈɑːm ˌresl","to try to push another person's hand down while your elbows stay on a table","білек күресу","бороться на руках","Can you arm wrestle? is a real interview question."],
"light bulb":["ˈlaɪt bʌlb","the glass part of a lamp that gives light","шам","лампочка","How many light bulbs are there in this city?"],
"issue":["ˈɪʃuː","an important problem that a lot of people discuss and argue about","мәселе","проблема, вопрос","Climate change is the biggest issue of our time."],
"global warming":["ˌɡləʊbl ˈwɔːmɪŋ","the slow rise in the temperature of the Earth's air and seas","жаһандық жылыну","глобальное потепление","Global warming came second in the survey."],
"hunger":["ˈhʌŋɡə","the state of not having enough food to eat","аштық","голод","If we solved hunger, everything else would get easier."],
"natural disaster":["ˌnætʃrəl dɪˈzɑːstə","a flood, an earthquake or a storm that causes great damage","табиғи апат","стихийное бедствие","Floods and earthquakes are natural disasters."],
"coral reef":["ˈkɒrəl riːf","a line of hard rock under the sea, made by tiny sea animals","маржан рифі","коралловый риф","Warmer water is killing the coral reefs."],
"continent":["ˈkɒntɪnənt","one of the seven very large areas of land on Earth","құрлық","континент","Africa is the second largest continent."],
"abroad":["əˈbrɔːd","in or to another country","шетелде","за границей","She works abroad, in Canada."],
"cure":["kjʊə","a medicine or treatment that makes an ill person well again","ем","лекарство, средство","Nobody has found a cure for the common cold."],
"invention":["ɪnˈvenʃn","a thing that somebody has made for the first time","өнертабыс","изобретение","The telephone was the invention that changed the century."],
"financial":["faɪˈnænʃl","connected with money","қаржылық","финансовый","Poorer countries worried about financial security."],
"powerful":["ˈpaʊəfl","having a lot of strength, control or influence","қуатты","мощный, влиятельный","If you were the most powerful person alive, what would you do?"],
"secure":["sɪˈkjʊə","safe, and not likely to change or fail","қауіпсіз","надёжный, безопасный","People want work that feels secure."],
"extreme":["ɪkˈstriːm","very great, far beyond the usual level","шектен тыс","крайний, экстремальный","Extreme weather is getting more common."],
"intelligent":["ɪnˈtelɪdʒənt","good at learning, understanding and thinking","ақылды","умный","Spend more money on drugs that make us more intelligent."],
"spread":["spred","to make something reach more people or a wider area","тарату","распространять(ся)","Good ideas spread faster than bad ones."],
"article":["ˈɑːtɪkl","a piece of writing in a newspaper or a magazine","мақала","статья","An article about a flood used to reach them weeks later."],
"telegraph":["ˈtelɪɡrɑːf","an old system for sending messages along wires","телеграф","телеграф","Then came the telegraph, and messages ran along wires."],
"weekly":["ˈwiːkli","happening once every seven days","апталық","еженедельный","People used to read a weekly paper, not a daily one."],
"election":["ɪˈlekʃn","the time when people vote to choose a government","сайлау","выборы","The country votes on Sunday, so the election result comes on Monday."],
"strike":["straɪk","when workers stop working to protest about something","ереуіл","забастовка","The drivers refused to work, so there was a strike."],
"robbery":["ˈrɒbəri","the crime of taking money or goods that are not yours","тонау","ограбление","A robbery in one town used to take three days to reach the next."],
"steal":["stiːl","to take something that is not yours, without permission","ұрлау","красть","Somebody tried to steal my bag at the market."],
"crash":["kræʃ","an accident in which a vehicle hits something","апат","авария, крушение","Two cars hit each other on the wet road — a bad crash."],
"flood":["flʌd","when a lot of water covers land that is usually dry","су тасқыны","наводнение","Heavy rain for three days caused a flood in the valley."],
"forest fire":["ˈfɒrɪst faɪə","a large fire that burns trees over a wide area","орман өрті","лесной пожар","The dry summer started a forest fire in the hills."],
"hurricane":["ˈhʌrɪkən","a violent tropical storm with extremely strong winds","дауыл","ураган","A hurricane in one country could be reported in another the same day."],
"erupt":["ɪˈrʌpt","(of a volcano) to throw out fire, rock and ash","атқылау","извергаться","When a volcano erupts, we find out in minutes."],
"find out":["ˌfaɪnd ˈaʊt","to learn something that you did not know before","білу","узнать, выяснить","I didn't know about the strike. How did you find out?"],
"grow up":["ˌɡrəʊ ˈʌp","to become an adult; to spend your childhood somewhere","өсу","расти, взрослеть","She grew up in a small town near the sea."],
"set up":["ˌset ˈʌp","to start a business or an organization","құру","основать, создать","They set up the first daily newspaper in 1855."],
"carry on":["ˌkæri ˈɒn","to continue doing something","жалғастыру","продолжать","It started raining, but we decided to carry on walking."],
"opinion":["əˈpɪnjən","what you think about something, when it is not a fact","пікір","мнение","In my opinion, that is the most interesting thing about it."],
"disagree":["ˌdɪsəˈɡriː","to say that you think differently from somebody","келіспеу","не соглашаться","I'm afraid I disagree — although you do see more cameras."],
"audience":["ˈɔːdiəns","the people who are listening to a speaker","аудитория","слушатели, аудитория","He looked straight at the audience and started again."],
"media":["ˈmiːdiə","newspapers, television, radio and the internet, taken together","БАҚ","СМИ","Some media experts are saying privacy is dead."],
"privacy":["ˈprɪvəsi","being able to keep your life and information to yourself","жеке өмір","частная жизнь","Do you think privacy is dead in our 21st century world?"],
"sculptor":["ˈskʌlptə","an artist who makes figures out of stone, metal or wood","мүсінші","скульптор","A sculptor put the first statues there in 2006."],
"man-made":["ˌmæn ˈmeɪd","built or produced by people, not natural","қолдан жасалған","рукотворный","A man-made object slowly becomes part of the environment."],
"home-made":["ˌhəʊm ˈmeɪd","made at home, not in a factory","үйде жасалған","домашний","It could be a jar of home-made jam."],
"up-to-date":["ˌʌp tə ˈdeɪt","current; including the most recent information","заманауи","современный, актуальный","His figures were from 2011, so they were not up-to-date."],
"environment":["ɪnˈvaɪrənmənt","the natural world of land, water, air and living things","қоршаған орта","окружающая среда","The statues actually help the environment."],
"bunch":["bʌntʃ","a number of things, especially flowers, held or tied together","шоқ","букет, связка","It could be a bunch of wild flowers, or a tiny toy."],
"expensive":["ɪkˈspensɪv","costing a lot of money","қымбат","дорогой","The gift shouldn't be expensive — that is the whole idea."],
/* ---- Unit 9 vocabulary ---- */
"shake hands":["\u0283e\u026ak h\u00e6ndz","to take someone's hand in yours and move it up and down as a greeting","\u049b\u043e\u043b \u0430\u043b\u044b\u0441\u0443","\u043f\u043e\u0436\u0430\u0442\u044c \u0440\u0443\u043a\u0438","We always shake hands before a meeting."],
"happen":["\u02c8h\u00e6p\u0259n","to take place, usually without being planned","\u0431\u043e\u043b\u0443, \u043e\u0440\u044b\u043d \u0430\u043b\u0443","\u0441\u043b\u0443\u0447\u0430\u0442\u044c\u0441\u044f, \u043f\u0440\u043e\u0438\u0441\u0445\u043e\u0434\u0438\u0442\u044c","Tell me how it happened."],
"cv":["\u02ccsi\u02d0\u02c8vi\u02d0","a short written record of your education and work experience, sent when you apply for a job","\u0442\u04af\u0439\u0456\u043d\u0434\u0435\u043c\u0435","\u0440\u0435\u0437\u044e\u043c\u0435","I attach my CV and two references."],
"CV":["\u02ccsi\u02d0\u02c8vi\u02d0","a short written record of your education and work experience, sent when you apply for a job","\u0442\u04af\u0439\u0456\u043d\u0434\u0435\u043c\u0435","\u0440\u0435\u0437\u044e\u043c\u0435","I attach my CV and two references."],
"greet":["ɡriːt","to say hello to someone when you meet them","амандасу","приветствовать","If you greet people warmly, they will remember you."],
"greeting":["ˈɡriːtɪŋ","the words or action you use when you meet someone","сәлемдесу","приветствие","For hundreds of years it was the safest greeting in business."],
"handshake":["ˈhændʃeɪk","the act of taking someone's hand and moving it up and down","қол алысу","рукопожатие","A single handshake can move germs from one palm to another."],
"hug":["hʌɡ","to put your arms around someone to show you like them","құшақтау","обнимать","A hug is for friends; a handshake is for work."],
"nod":["nɒd","to move your head down and up to mean yes","бас изеу","кивок","In many places a nod has taken its place."],
"clap":["klæp","to hit your hands together to show you liked something","қол шапалақтау","хлопать в ладоши","People clap when the speaker finishes."],
"congratulate":["kənˈɡrætʃuleɪt","to tell someone you are happy about their good news","құттықтау","поздравлять","If she gets the job, we will congratulate her."],
"smile":["smaɪl","to move your mouth to show you are happy or friendly","күлімсіреу","улыбка","A nod, a smile or a fist bump has taken its place."],
"touch":["tʌtʃ","to put your hand on something or someone","жанасу","трогать","In 2020 the world stopped touching."],
"impression":["ɪmˈpreʃn","the idea other people form about you when they first meet you","әсер","впечатление","The first impression might be strange."],
"respect":["rɪˈspekt","a good opinion of someone because of what they are or do","құрмет","уважение","The handshake began as a sign of trust and respect."],
"rude":["ruːd","not polite; likely to upset other people","дөрекі","грубый","If you refuse the hand, some people will think you are rude."],
"informal":["ɪnˈfɔːml","relaxed and friendly, not official","бейресми","неформальный","Others say it is simply more informal."],
"germs":["dʒɜːmz","very small living things that can make you ill","микробтар","микробы","A handshake can move germs in less than a second."],
"virus":["ˈvaɪrəs","a very small living thing that causes illness","вирус","вирус","A virus travels fastest between people who greet each other all day."],
"trend":["trend","a general direction in which things are changing","үрдіс","тенденция","The trend started in offices and moved outside."],
"ridiculous":["rɪˈdɪkjələs","so silly that it is hard to take seriously","күлкілі, ақылға сыймайтын","нелепый","Some people think this trend is ridiculous."],
"palm":["pɑːm","the inside surface of your hand","алақан","ладонь","from one palm to another"],
"cheek":["tʃiːk","the soft part of your face below your eye","бет","щека","In some countries you kiss both cheeks."],
"chin":["tʃɪn","the part of your face below your mouth","иек","подбородок","He rested his chin on his hand."],
"elbow":["ˈelbəʊ","the place where your arm bends","шынтақ","локоть","Offices will go back to the elbow bump."],
"forehead":["ˈfɔːhed","the part of your face above your eyes","маңдай","лоб","She put her hand on his forehead."],
"fist":["fɪst","your hand with the fingers closed tightly","жұдырық","кулак","A fist bump has taken its place."],
"shoulder":["ˈʃəʊldə","the part of your body between your neck and your arm","иық","плечо","He put a hand on her shoulder."],
"thumb":["θʌm","the short thick finger at the side of your hand","бас бармақ","большой палец","A thumbs up means yes."],
"tongue":["tʌŋ","the soft part inside your mouth that you use to taste and speak","тіл","язык","Do not bite your tongue."],
"fitness":["ˈfɪtnəs","how strong and healthy your body is","дене шынықтыру деңгейі","физическая форма","When you arrive, the instructor will check your fitness level."],
"health":["helθ","the condition of your body and mind","денсаулық","здоровье","A week outdoors will do your health good."],
"healthy":["ˈhelθi","strong and well, or good for you","дені сау","здоровый","You will feel healthy again as soon as you stop eating junk food."],
"diet":["ˈdaɪət","the food a person normally eats","тамақтану","питание","Change your diet first, then change your training."],
"disease":["dɪˈziːz","an illness, especially a serious one","ауру","болезнь","Gentle exercise lowers the risk of heart disease."],
"junk food":["dʒʌŋk fuːd","food that is quick and easy but bad for you","зиянды тағам","вредная еда","He gave up junk food before he started the course."],
"weight-lifting":["ˈweɪt lɪftɪŋ","the sport of lifting heavy metal bars","ауыр атлетика","тяжёлая атлетика","MovNat is not weight-lifting - there is no gym at all."],
"cycling":["ˈsaɪklɪŋ","the sport or activity of riding a bicycle","велосипед тебу","езда на велосипеде","She goes cycling every morning until the snow comes."],
"active":["ˈæktɪv","doing a lot of physical activity","белсенді","активный","Stay active and your body will thank you."],
"gentle":["ˈdʒentl","soft and careful, not hard or fast","жұмсақ","мягкий","Start with gentle movement, not with a heavy barbell."],
"natural":["ˈnætʃrəl","made by nature, not by people","табиғи","естественный","MovNat teaches natural movement."],
"peace":["piːs","a quiet, calm feeling with nothing to disturb you","тыныштық","покой","There is a kind of peace you only find outdoors."],
"depressed":["dɪˈprest","very sad and without hope for a long time","көңілсіз","подавленный","People who exercise outdoors are less often depressed."],
"painkiller":["ˈpeɪnkɪlə","a tablet you take to stop something hurting","ауырсынуды басатын дәрі","обезболивающее","Take a painkiller if it still hurts tomorrow."],
"medical":["ˈmedɪkl","connected with medicine and treating illness","медициналық","медицинский","You do not need a medical certificate for this course."],
"diabetes":["ˌdaɪəˈbiːtiːz","an illness in which there is too much sugar in the blood","қант диабеті","диабет","A better diet lowers the risk of diabetes."],
"mosquito":["məˈskiːtəʊ","a small flying insect that bites people","маса","комар","Well, it looks like a mosquito."],
"argument":["ˈɑːɡjumənt","an angry talk between people who disagree","дау","спор","They had a short argument about who should apply first."],
"assignment":["əˈsaɪnmənt","a piece of work a student or an employee is given","тапсырма","задание","I have to finish this assignment before Friday."],
"ceremony":["ˈserəməni","a formal public event, for example when someone gets a prize","салтанат","церемония","The ceremony starts at two, straight after graduation."],
"graduation":["ˌɡrædʒuˈeɪʃn","the day you officially finish your studies","бітіру салтанаты","выпуск","She was offered the job the week after her graduation."],
"philosophy":["fəˈlɒsəfi","the set of ideas a person or company works by","ұстаным","философия","Training in all weather is part of our philosophy."],
"press":["pres","to push something firmly","басу","нажимать","Press the button and wait for the green light."],
"stick to":["stɪk tuː","to keep doing something and not change it","ұстану","придерживаться","If I were you, I would stick to one page."],
"position":["pəˈzɪʃn","a job in a company","лауазым","должность","I am writing to apply for the position of assistant."],
"vacancy":["ˈveɪkənsi","a job that is free and needs a new person","бос орын","вакансия","I saw the vacancy on your website last week."],
"attach":["əˈtætʃ","to send a file together with an email or letter","тіркеу","прикреплять","I attach my CV and two references."],
"covering letter":["ˈkʌvərɪŋ ˈletə","the letter you send with your CV to say why you want the job","ілеспе хат","сопроводительное письмо","A good covering letter says why you, and why them."],
"reserve":["rɪˈzɜːv","to arrange for something to be kept for you","броньдау","бронировать","You will definitely need to reserve a place before you come."],
"instructor":["ɪnˈstrʌktə","a person who teaches a skill or a sport","нұсқаушы","инструктор","When you arrive, the instructor will check your fitness level."],
"disappear":["ˌdɪsəˈpɪə","to go away and stop being there","жоғалу","исчезать","The handshake has not disappeared."],
"messenger":["ˈmesɪndʒə","a person who carries a message","хабаршы","посыльный","The hand is only the messenger."],
/* ---- Unit 10 vocabulary ---- */
"best before":["ˌbest bɪˈfɔː","a date that tells you when food stops being at its best quality; after it the food is usually still safe","дейін жақсы (мерзімі)","годен до (лучшее качество)","The biscuits are two days past their best before date, but they are fine."],
"use by":["ˈjuːz baɪ","a date that tells you when food stops being safe; after it you should not eat the food","дейін пайдалану (мерзімі)","употребить до","Do not eat the fish after the use by date."],
"taste":["teɪst","the flavour of a food, or to notice that flavour","дәм","вкус","Dark chocolate has a nice, bitter taste."],
"taste buds":["ˈteɪst bʌdz","the very small parts of your tongue that notice sweet, sour, bitter and salty","дәм бүршіктері","вкусовые рецепторы","Your tongue is covered with taste buds."],
"flavour":["ˈfleɪvə","the particular taste of a food, especially a nice one","дәм, хош иіс","вкус, аромат","You dip them into the sauce to give them extra flavour."],
"texture":["ˈtekstʃə","the way food feels in your mouth","құрылымы","текстура","Texture decides more than people admit."],
"bitter":["ˈbɪtə","with a sharp, strong taste, like black coffee or dark chocolate","ащы, кермек","горький","a nice, bitter taste"],
"sour":["ˈsaʊə","with a sharp taste, like a lemon","қышқыл","кислый","lime juice to make it sour"],
"spicy":["ˈspaɪsi","with a hot, strong taste, because it has chillies or pepper in it","өткір","острый","chilli to make it spicy"],
"savoury":["ˈseɪvəri","salty rather than sweet","тұздау","несладкий, солоноватый","You can also have savoury scones."],
"plain":["pleɪn","simple, with nothing added","қарапайым","простой, без добавок","It's quite plain, really."],
"raw":["rɔː","not cooked","шикі","сырой","filled with raw vegetables"],
"boiled":["bɔɪld","cooked in hot water","қайнатылған","варёный","fresh herbs and boiled noodles"],
"thick":["θɪk","not thin; it pours slowly","қою","густой","It's often served with thick cream."],
"spice":["spaɪs","a seed, powder or root that gives food a strong taste","дәмдеуіш","специя","lamb cooked in a thick sauce with onions and spices"],
"herb":["hɜːb","a green plant such as mint or basil that gives food a fresh taste","шөп","трава, зелень","raw vegetables and fresh herbs"],
"honey":["ˈhʌni","the sweet, thick food made by bees","бал","мёд","The tagine has some honey in it."],
"stew":["stjuː","meat and vegetables cooked slowly together in liquid","бұқтырылған тағам","тушёное блюдо","It's a kind of stew."],
"snack":["snæk","a small amount of food eaten between meals","жеңіл тағам","перекус","served as part of a meal or as a snack"],
"tagine":["tæˈʒiːn","a slow-cooked North African stew, and the dish it is cooked in","тажин","тажин","There are several types of tagine."],
"curry":["ˈkʌri","a dish cooked in a spicy sauce","карри","карри","a hot curry"],
"lamb":["læm","meat from a young sheep","қой еті","баранина","pieces of lamb in a thick sauce"],
"sauce":["sɔːs","a thick liquid served with food","тұздық","соус","a thick, slightly sour sauce"],
"olives":["ˈɒlɪvz","small green or black fruit eaten with salt, or used for oil","зәйтүн","оливки","Olives are sold in a glass jar."],
"spinach":["ˈspɪnɪdʒ","a dark green leaf vegetable","шпинат","шпинат","Avoiding spinach is not fussiness."],
"strawberry":["ˈstrɔːbri","a soft red summer fruit","құлпынай","клубника","strawberry or raspberry jam"],
"raspberry":["ˈrɑːzbri","a soft red summer fruit with many small parts","таңқурай","малина","strawberry or raspberry jam"],
"supertaster":["ˈsuːpəteɪstə","a person with far more taste buds than average","дәмді күшті сезінетін адам","супердегустатор","About a quarter of people are supertasters."],
"can":["kæn","a closed metal container for food or drink","консерві банка","консервная банка","Open a can of tomatoes."],
"tin":["tɪn","a closed metal container for food; British English for a can","қаңылтыр банка","жестяная банка","the safe modern tin opener"],
"jar":["dʒɑː","a glass container with a wide top and a lid","шыны банка","банка","a jar of honey"],
"packet":["ˈpækɪt","a small paper or plastic container for dry food","пакет","пачка","a packet of rice"],
"cardboard":["ˈkɑːdbɔːd","thick, stiff paper used for boxes","картон","картон","The boxes are made of cardboard."],
"tube":["tjuːb","a soft container you squeeze, for paste or cream","түтікше","тюбик","a tube of tomato paste"],
"bottle":["ˈbɒtl","a tall container for liquid, usually glass or plastic","бөтелке","бутылка","a bottle of sparkling water"],
"container":["kənˈteɪnə","anything you keep or carry something in","ыдыс","контейнер","Metal containers were invented in 1810."],
"preserve":["prɪˈzɜːv","to treat food so that it stays safe to eat for longer","сақтау","консервировать","His invention preserved food beautifully."],
"frozen":["ˈfrəʊzn","kept very cold so that it does not go bad","мұздатылған","замороженный","frozen peas from the freezer"],
"fry":["fraɪ","to cook in hot oil in a pan","қуыру","жарить","these ones are fried"],
"bake":["beɪk","to cook in an oven, without oil","пісіру","печь","They're baked in the oven."],
"consumer":["kənˈsjuːmə","a person who buys and uses things","тұтынушы","потребитель","Half of the waste comes from consumers."],
"wasteful":["ˈweɪstfl","using or throwing away more than you need","ысырапшыл","расточительный","Throwing good food away is wasteful."],
"transportation":["ˌtrænspɔːˈteɪʃn","the moving of goods or people from place to place","тасымалдау","транспортировка","the cost of transportation"],
"invent":["ɪnˈvent","to make or think of something for the first time","ойлап табу","изобретать","The can was invented in 1810."],
"waiter":["ˈweɪtə","the person who brings your food in a restaurant","даяшы","официант","The waiter apologised immediately."],
"service":["ˈsɜːvɪs","the way the staff look after you","қызмет көрсету","обслуживание","The only downside was the service."],
"portion":["ˈpɔːʃn","the amount of food on one plate","порция","порция","The portions are generous."],
"overcooked":["ˌəʊvəˈkʊkt","cooked for too long, so it is dry or hard","артық пісірілген","переваренный","It was badly overcooked."],
"undercooked":["ˌʌndəˈkʊkt","not cooked for long enough","шала пісірілген","недоваренный","The chicken was undercooked."],
"doggy bag":["ˈdɒɡi bæɡ","a box for the food you did not finish, to take home","үйге алатын қорап","контейнер навынос","We asked for a doggy bag."],
"shocking":["ˈʃɒkɪŋ","so bad that it surprises and annoys you","таңқаларлық","возмутительный","Forty minutes for a glass of water is shocking."],
"sparkling water":["ˈspɑːklɪŋ ˈwɔːtə","water with gas in it","газдалған су","газированная вода","A bottle of sparkling water, please."],
"apple juice":["ˈæpl dʒuːs","a drink made from apples","алма шырыны","яблочный сок","He ordered apple juice."],
"alcoholic drink":["ˌælkəˈhɒlɪk drɪŋk","a drink containing alcohol","алкогольді сусын","алкогольный напиток","They don't serve alcoholic drinks at lunchtime."],
"recommend":["ˌrekəˈmend","to tell other people that something is good","ұсыну","рекомендовать","I would recommend it for a small group."],
"atmosphere":["ˈætməsfɪə","the feeling a place gives you","атмосфера","атмосфера","The atmosphere is the best thing here."],
"value":["ˈvæljuː","how good something is for the money you pay","бағасы мен сапасы","соотношение цены и качества","For 6,000 tenge it is very good value."],
"downside":["ˈdaʊnsaɪd","the one bad thing about something that is mostly good","кемшілігі","минус","The only downside was the service."],
"generous":["ˈdʒenərəs","larger than you expected; willing to give","мол","щедрый","the portions are generous"],
"apologize":["əˈpɒlədʒaɪz","to say you are sorry","кешірім сұрау","извиняться","I do apologize."],
"grill":["ɡrɪl","to cook over or under direct heat","грильде пісіру","готовить на гриле","The aubergines are grilled over a fire."],
"refuse":["rɪˈfjuːz","to say no to something","бас тарту","отказываться","Many children refuse the same carrot raw."],
"exposure":["ɪkˈspəʊʒə","how often you meet something","кездесу жиілігі","воздействие, знакомство","Repeated exposure changes what children accept."],
/* ---- Unit 7 vocabulary ---- */
"bus pass":["bʌs pɑːs","a card you buy once, then travel by bus as many times as you want","автобус жол жүру картасы","проездной на автобус","I have a bus pass which makes it cheaper."],
"fare":["feə","the money you pay for one journey","жол ақысы","плата за проезд","Bus fares are expensive."],
"fuel":["ˈfjuːəl","anything you burn to make an engine work; petrol and diesel are both fuels","отын","топливо","They use less fuel and create less pollution."],
"petrol":["ˈpetrəl","the liquid fuel most cars have used until now","бензин","бензин","There will be less pollution from petrol and diesel."],
"diesel":["ˈdiːzl","a heavier fuel used by lorries, buses and some cars","дизель отыны","дизельное топливо","Shenzhen replaced every diesel bus with an electric one."],
"pollution":["pəˈluːʃn","dirty air, water or land made by engines and factories","ауаның ластануы","загрязнение","There is less pollution in the quieter streets."],
"traffic jam":["ˈtræfɪk dʒæm","a long line of cars that is not moving","кептеліс","пробка","There are often bad traffic jams on the motorway."],
"cycle lane":["ˈsaɪkl leɪn","the part of a road that is only for bicycles","велосипед жолағы","велодорожка","The main roads have special cycle lanes."],
"main road":["meɪn rəʊd","a big, busy road between towns or across a city","басты жол","главная дорога","I usually avoid the main roads."],
"track":["træk","the metal lines a train runs on","теміржол жолы","железнодорожный путь","A city has to build the cycle lanes and the tracks first."],
"high-speed":["ˌhaɪ ˈspiːd","built to travel much faster than normal","жоғары жылдамдықты","высокоскоростной","Dozens of countries have opened high-speed lines."],
"efficient":["ɪˈfɪʃnt","working well and wasting very little time or energy","тиімді","эффективный, экономичный","Public transport will become more efficient."],
"reliable":["rɪˈlaɪəbl","you can trust it: it works, and it is on time","сенімді","надёжный","The trains are reliable - they usually leave on time."],
"convenient":["kənˈviːniənt","easy to use, and close to where you are","ыңғайлы","удобный","The bus is the most convenient form of transport for me."],
"greener":["ˈɡriːnə","better for the environment than something else","экологиялық тазарақ","более экологичный","Buses are greener now than in the past."],
"predict":["prɪˈdɪkt","to say what will happen before it happens","болжау","предсказывать","Nobody can predict the future perfectly."],
"development":["dɪˈveləpmənt","a new thing that has been invented or built","әзірлеме, жаңалық","разработка, новшество","New developments might change rural transport."],
"noise":["nɔɪz","a sound, especially a loud or unpleasant one","шу","шум","Electric engines make almost no noise."],
"journey":["ˈdʒɜːni","the act of travelling from one place to another","сапар, жол жүру","поездка","The journey is much slower by bus."],
"engine":["ˈendʒɪn","the part of a vehicle that makes it move","қозғалтқыш","двигатель","Electric engines make almost no noise."],
"driverless":["ˈdraɪvələs","working without a person driving it","жүргізушісіз","беспилотный","Some people think we will all travel in driverless taxis."],
"accommodation":["əˌkɒməˈdeɪʃn","a place to sleep when you are away from home","баспана, тұрғын үй","жильё, проживание","It is not exactly five-star accommodation."],
"hostel":["ˈhɒstl","a cheap place to stay, often with shared rooms","хостел","хостел","We could not afford a hotel, so we stayed in a hostel."],
"self-catering":["ˌself ˈkeɪtərɪŋ","with a kitchen, so you cook for yourself","өз тамағын әзірлейтін","с собственной кухней","The flat was self-catering, so we cooked every evening."],
"luggage":["ˈlʌɡɪdʒ","the bags and cases you travel with; there is no plural form","жүк, багаж","багаж","Is there somewhere we can leave our luggage?"],
"guidebook":["ˈɡaɪdbʊk","a book that tells you about a place you are visiting","жол көрсеткіш кітап","путеводитель","According to my guidebook, Manga cafes are a good choice."],
"souvenir":["ˌsuːvəˈnɪə","a small thing you buy to remember a place","кәдесый","сувенир","I never buy a souvenir at the airport."],
"currency":["ˈkʌrənsi","the money a country uses","валюта","валюта","Change some currency before you arrive."],
"insurance":["ɪnˈʃʊərəns","you pay for this, and you get money back if something goes wrong","сақтандыру","страховка","You should always take out travel insurance."],
"hire":["ˈhaɪə","to pay to use something for a short time","жалға алу","брать напрокат","You can hire a bike at the station for the day."],
"foreign":["ˈfɒrən","from or in another country","шетелдік","иностранный","Everything sounds louder in a foreign city."],
"remote":["rɪˈməʊt","a long way from towns and from other people","шалғай","отдалённый","The village is remote - the nearest shop is thirty kilometres away."],
"basic":["ˈbeɪsɪk","simple, with nothing extra","қарапайым","самый простой","The room was basic: a bed, a chair and nothing else."],
"relaxing":["rɪˈlæksɪŋ","making you feel calm and rested","демалдыратын","расслабляющий","A week with nothing to do is relaxing."],
"relaxed":["rɪˈlækst","feeling calm and rested","тынышталған","расслабленный","I felt relaxed after two days there."],
"fascinating":["ˈfæsɪneɪtɪŋ","extremely interesting","қызықты, тартымды","увлекательный","Manga is a fascinating part of Japanese culture."],
"fascinated":["ˈfæsɪneɪtɪd","feeling very interested in something","қызығушылық танытқан","увлечённый","I was fascinated by the walls of books."],
"boring":["ˈbɔːrɪŋ","not interesting; it makes you feel bored","жалықтыратын","скучный","The village was boring - there was nothing to do."],
"bored":["bɔːd","feeling that nothing here is interesting","жалыққан","скучающий","There was nothing to do in the village. I was bored."],
"tiring":["ˈtaɪərɪŋ","it makes you feel tired","шаршататын","утомительный","The flight was twelve hours. It was very tiring."],
"exhausting":["ɪɡˈzɔːstɪŋ","extremely tiring","қатты шаршататын","изнурительный","Three flights in one day is exhausting."],
"exciting":["ɪkˈsaɪtɪŋ","it makes you feel excited","қызықты, толқытатын","волнующий","A first trip abroad is exciting."],
"annoying":["əˈnɔɪɪŋ","it makes you slightly angry","мазалайтын","раздражающий","The noise from the corridor was annoying."],
"annoyed":["əˈnɔɪd","feeling slightly angry","ашуланған","раздражённый","When they lost my luggage I was extremely annoyed."],
"surprising":["səˈpraɪzɪŋ","you did not expect it","таңқаларлық","удивительный","The price was surprising."],
"surprised":["səˈpraɪzd","feeling that you did not expect this","таңғалған","удивлённый","I was surprised by how cheap it was."],
"confusing":["kənˈfjuːzɪŋ","hard to understand","шатастыратын","сбивающий с толку","The map in the guidebook was completely confusing."],
"amazing":["əˈmeɪzɪŋ","very surprising and very good","таңғажайып","потрясающий","The view from the room was amazing."],
"amazed":["əˈmeɪzd","feeling very surprised","таң қалған","поражённый","I was amazed by the number of books."],
"worried":["ˈwʌrid","unhappy because you think something bad may happen","алаңдаған","обеспокоенный","I was worried about the last-minute booking."],
"ceiling":["ˈsiːlɪŋ","the top surface of a room, above your head","төбе","потолок","The books are displayed from floor to ceiling."],
"blanket":["ˈblæŋkɪt","a thick cover you put on a bed to keep warm","жамылғы","одеяло","It is not really a bed, but there is a blanket."],
"reservation":["ˌrezəˈveɪʃn","a room, table or seat you have booked before you arrive","брондау","бронь","Do you have a reservation?"],
"check in":["tʃek ˈɪn","to arrive at a hotel and give your name so you can get your room","тіркелу, орналасу","заселяться","I'd like to check in, please."],
"check out":["tʃek ˈaʊt","to pay and leave a hotel at the end of your stay","нөмірден шығу","выселяться","What time is check out?"],
"registration form":["ˌredʒɪˈstreɪʃn fɔːm","the paper you fill in with your name and address","тіркеу нысаны","регистрационная форма","Could you fill in the registration form, please?"],
"single room":["ˌsɪŋɡl ˈruːm","a hotel room for one person","бір орындық нөмір","одноместный номер","That's a single room for two nights."],
"double room":["ˌdʌbl ˈruːm","a hotel room for two people","екі орындық нөмір","двухместный номер","So that's a double room for three nights?"],
"available":["əˈveɪləbl","there, and possible to get or use","қолжетімді","доступный","Is Wi-Fi available in the room?"],
"charge":["tʃɑːdʒ","money you have to pay for a service","ақы","плата","Is there a charge for it?"],
"included":["ɪnˈkluːdɪd","already in the price, so you pay nothing more","бағаға кіреді","включённый в цену","Is breakfast included?"],
"spare":["speə","a second one, kept in case you need it","қосалқы","запасной","Could I have a spare key, please?"],
"replace":["rɪˈpleɪs","to take one thing away and put a new one there","ауыстыру","заменить","Could somebody replace the towels?"],
"advantage":["ədˈvɑːntɪdʒ","a good thing that one choice has and another does not","артықшылық","преимущество","One advantage of booking direct is a free room change."],
"regular":["ˈreɡjələ","happening or coming back again and again","тұрақты","постоянный","We are regular guests here."],
"apply":["əˈplaɪ","to be true in a particular case; also, to ask officially for something","қолданылу; өтініш беру","распространяться; подавать заявку","The discount does not apply at the weekend."],
"heating":["ˈhiːtɪŋ","the system that keeps a building warm","жылыту жүйесі","отопление","There's a problem with the heating."],
"shower":["ˈʃaʊə","the thing you stand under to wash","душ","душ","The shower does not work."],
"book in advance":["bʊk ɪn ədˈvɑːns","to buy a ticket or room a long time before you travel","алдын ала брондау","бронировать заранее","The fares are much cheaper if you book in advance."],
"last minute":["ˌlɑːst ˈmɪnɪt","at the latest possible time, just before something happens","соңғы сәтте","в последний момент","We booked it at the last minute and paid double."],
/* ---- Unit 8 vocabulary ---- */
"brain":["breɪn","the organ inside your head that lets you think, feel and remember","ми","мозг","The brain takes about twenty per cent of your energy."],
"memory":["ˈmeməri","the ability to remember, or a thing you remember","жады","память","Your brain will not be able to give you a perfect memory."],
"ability":["əˈbɪləti","the fact that you are able to do something","қабілет","способность","They were not born with this ability. They built it."],
"talent":["ˈtælənt","a natural skill you did not have to learn","талант","талант","Mozart cannot give a child a talent it did not have."],
"imagination":["ɪˌmædʒɪˈneɪʃn","the part of your mind that makes pictures of things you have never seen","қиял","воображение","Computers are still not able to copy imagination."],
"emotion":["ɪˈməʊʃn","a strong feeling such as fear, anger or joy","эмоция","эмоция, чувство","Computers aren't able to feel emotions."],
"myth":["mɪθ","a story that many people believe, but which is not true","аңыз, миф","миф","The ten-per-cent story is a myth."],
"connection":["kəˈnekʃn","a link between two things, or between two cells in the brain","байланыс","связь","You practised, and the connections grew."],
"remember":["rɪˈmembə","to keep something in your memory and bring it back","есте сақтау","помнить, вспоминать","It cannot remember everything you read."],
"solve":["sɒlv","to find the answer to a problem","шешу","решать","A good mood helps you solve problems."],
"understand":["ˌʌndəˈstænd","to know what something means","түсіну","понимать","Ten years ago you could not understand this sentence."],
"achieve":["əˈtʃiːv","to reach something you have worked for","қол жеткізу","достигать","Almost everyone can achieve something new."],
"spelling":["ˈspelɪŋ","the way the letters of a word are put together","емле","правописание","She's good at spelling."],
"map reading":["ˈmæp riːdɪŋ","the skill of finding your way using a map","картаны оқу","чтение карты","She's quite good at map reading."],
"tell jokes":["tel dʒəʊks","to say short funny stories to make people laugh","әзіл айту","рассказывать шутки","He isn't very good at telling jokes."],
"creatively":["kriˈeɪtɪvli","in a way that produces new ideas","шығармашылықпен","творчески","The human brain can think creatively."],
"education":["ˌedʒuˈkeɪʃn","the teaching and learning that happens in schools","білім беру","образование","Parents cannot buy a better education."],
"state school":["steɪt skuːl","a school paid for by the government, free for the family","мемлекеттік мектеп","государственная школа","Nearly every child goes to a state school."],
"private school":["ˈpraɪvət skuːl","a school that families pay fees to","жеке мектеп","частная школа","The few private schools are not allowed to charge fees."],
"entrance exam":["ˈentrəns ɪɡˌzæm","a test you must pass before a school or university takes you","қабылдау емтиханы","вступительный экзамен","You have to pass an entrance exam to get in."],
"grade":["ɡreɪd","the mark a teacher gives you for your work","баға","оценка","You sit tests to prove that you deserve your grade."],
"degree":["dɪˈɡriː","what you get after three or more years at university","дәреже","учёная степень","A teacher must have a master's degree."],
"diploma":["dɪˈpləʊmə","an official paper you get at the end of a course of study","диплом","диплом","A one-year diploma is shorter than a degree."],
"qualification":["ˌkwɒlɪfɪˈkeɪʃn","an official paper that shows you are able to do a job","біліктілік","квалификация","The system trusts a qualification it made difficult to get."],
"course":["kɔːs","a set of lessons on one subject","курс","курс","The courses that train them are hard to enter."],
"strict":["strɪkt","following the rules very carefully, allowing no exceptions","қатаң","строгий","But one rule in Finland is very strict."],
"maths":["mæθs","the subject of numbers and shapes","математика","математика","Finland is near the top in reading, maths and science."],
"science":["ˈsaɪəns","the study of the physical world through experiments","жаратылыстану","наука","Finland is near the top in reading, maths and science."],
"literature":["ˈlɪtrətʃə","books, plays and poems studied as a subject","әдебиет","литература","We had to read four literature books a year."],
"decision":["dɪˈsɪʒn","a choice you make after thinking","шешім","решение","I hate making decisions."],
"success":["səkˈses","the result when something works well","табыс","успех","Its success surprised everybody."],
"train":["treɪn","to teach someone the skills they need for a job","дайындау","готовить, обучать","The courses that train them are hard to enter."],
"surname":["ˈsɜːneɪm","your family name","тегі","фамилия","Could I have your surname, please?"],
"date of birth":["deɪt əv ˈbɜːθ","the day, month and year you were born","туған күні","дата рождения","And, er, your date of birth?"],
"marital status":["ˈmærɪtl ˈsteɪtəs","whether you are single, married or divorced","отбасылық жағдайы","семейное положение","Under marital status he wrote 'single'."],
"occupation":["ˌɒkjuˈpeɪʃn","the job you do","мамандығы","род занятий, профессия","Under occupation she wrote 'nurse'."],
"signature":["ˈsɪɡnətʃə","your own name written by hand at the end of a form","қолтаңба","подпись","The form is not valid without your signature."],
"block capitals":["blɒk ˈkæpɪtlz","large letters used so that words are easy to read","бас әріптермен","печатные заглавные буквы","Please complete the form in block capitals."],
"tick":["tɪk","to put a small mark in a box to show you agree","белгі қою","ставить галочку","Tick the box if you have travel insurance."],
"next of kin":["nekst əv ˈkɪn","the family member a company should contact in an emergency","жақын туысы","ближайший родственник","And who's your next of kin?"],
"enrol":["ɪnˈrəʊl","to put your name on the list for a course or a school","тіркелу","записаться","You can enrol on the January course online."],
"register":["ˈredʒɪstə","to put your name in an official record","тіркелу","регистрироваться","First register on the site, then you can pay."],
"explain":["ɪkˈspleɪn","to make something clear by giving more information","түсіндіру","объяснять","Please could you explain?"],
"signal":["ˈsɪɡnəl","the radio waves a phone needs in order to work","сигнал","сигнал, связь","I keep losing the signal."],
"search engine":["ˈsɜːtʃ ˌendʒɪn","a website you use to look things up on the internet","іздеу жүйесі","поисковая система","Put the word into a search engine first."],
"promotion":["prəˈməʊʃn","a move to a better job in the same company","қызметте жоғарылау","повышение","She filled in three forms before she got the promotion."],
"licence":["ˈlaɪsns","an official paper that allows you to do something","куәлік","лицензия, права","To get their licence, the drivers had to learn every street."],
"prove":["pruːv","to show that something is true","дәлелдеу","доказывать","You sit tests to prove that you deserve your grade."],
"deposit":["dɪˈpɒzɪt","the first part of a payment, paid in advance","алғашқы төлем","задаток","Please pay the deposit online."],
"allowed":["əˈlaʊd","permitted; you may do it","рұқсат етілген","разрешённый","Private schools are not allowed to charge fees."],
"noisy":["ˈnɔɪzi","full of loud sound","шулы","шумный","It's too noisy in here."],
/* ---- Units 5-6 vocabulary ---- */
"possessions":["pəˈzeʃnz","the things that belong to you","дүние-мүлік","вещи, имущество","My favourite possession is definitely my scooter."],
"collection":["kəˈlekʃn","a group of similar things you keep together","жинақ","коллекция","He keeps his whole collection of records in one box."],
"antique":["ænˈtiːk","very old and often worth a lot of money","антиквар","антикварный","It's antique and it's gold."],
"brand new":["ˌbrænd ˈnjuː","completely new; only just bought","жаңа","совершенно новый","It's brand new. I only got it a few weeks ago."],
"valuable":["ˈvæljuəbl","worth a lot of money","құнды","ценный","It's not very valuable — not worth much money."],
"essential":["ɪˈsenʃl","that you absolutely must have","аса қажет","необходимый","Not very useful? It's essential!"],
"suitable":["ˈsuːtəbl","right for a particular purpose or situation","қолайлы","подходящий","It isn't suitable for work."],
"fashionable":["ˈfæʃnəbl","in the style that is popular now","сәнді","модный","Keep it. It's quite fashionable, you know."],
"condition":["kənˈdɪʃn","the state something is in — good or bad","күй, жағдай","состояние","But it's in very good condition."],
"minimalist":["ˈmɪnɪməlɪst","with very few things and no decoration","минималистік","минималистичный","After she gave half of it away, the flat looked very minimalist."],
"leather":["ˈleðə(r)","material made from animal skin","тері","кожа","The seat's made of leather, so it's very comfortable to ride."],
"metal":["ˈmetl","a hard material such as gold, iron or steel","металл","металл","It's made of a kind of pale grey metal."],
"plastic":["ˈplæstɪk","a light artificial material","пластик","пластик","And it's got a plastic cover to protect it."],
"shiny":["ˈʃaɪni","reflecting the light; bright and polished","жылтыр","блестящий","It's so bright and shiny!"],
"bright":["braɪt","strong and clear in colour","ашық түсті","яркий","I love the colour of it, and it's so bright."],
"pale":["peɪl","light and not strong in colour","бозғылт","бледный, светлый","It's made of a kind of pale grey metal."],
"heavy":["ˈhevi","weighing a lot; hard to lift","ауыр","тяжёлый","It's quite large and really heavy."],
"thin":["θɪn","not thick; narrow from one side to the other","жұқа","тонкий","It's very thin and light, so it's easy to carry around."],
"time capsule":["ˈtaɪm kæpsjuːl","a container of objects opened years later","уақыт капсуласы","капсула времени","The box is called a time capsule."],
"ordinary":["ˈɔːdnri","normal; not special in any way","қарапайым","обычный","It's just an ordinary one, nothing special."],
"tiny":["ˈtaɪni","extremely small","өте кішкентай","крошечный","It's really, really small — tiny, in fact."],
"afford":["əˈfɔːd","to have enough money for something","шамасы келу","позволить себе","She can't afford a holiday this year."],
"balance":["ˈbæləns","the amount of money left in your account","қалдық","остаток на счёте","She checks the balance of her account almost every day."],
"bank account":["ˈbæŋk əkaʊnt","the place at the bank where your money is kept","банк шоты","банковский счёт","He never looks at his bank account until the end of the month."],
"bill":["bɪl","a piece of paper telling you what you must pay","шот","счёт к оплате","There are three bills on the table."],
"borrow":["ˈbɒrəʊ","to take money and promise to return it","қарызға алу","занять","He had to borrow some money from his brother."],
"owe":["əʊ","to have to give money back to somebody","қарыз болу","быть должным","He owes the bank a lot of money."],
"pay back":["ˌpeɪ ˈbæk","to return money you took","қарызды қайтару","вернуть долг","Every year he promises to pay it back."],
"debt":["det","money that you owe somebody","қарыз","долг","She never has any debt."],
"credit card":["ˈkredɪt kɑːd","a card you use to pay and repay later","несие картасы","кредитная карта","He has a credit card and he uses it too much."],
"save up":["ˌseɪv ˈʌp","to keep money over time for something you want","жинау","копить","She is saving up for a flat of her own."],
"rent":["rent","money you pay every month to live in a place","жалдау ақысы","аренда","He pays a low rent."],
"fee":["fiː","a fixed charge for a service","алым","плата, взнос","Three streaming services, each with a small monthly fee."],
"refund":["ˈriːfʌnd","money returned when you send something back","ақшаны қайтару","возврат денег","The shop gave her a full refund."],
"transfer":["trænsˈfɜː(r)","to move money from one account to another","аудару","перевести","She transfers a little money to her savings every month."],
"coin":["kɔɪn","a piece of metal money","тиын","монета","He had only a few coins left in his pocket."],
"note":["nəʊt","a piece of paper money","банкнот","банкнота","She paid with a twenty-thousand tenge note."],
"economy":["ɪˈkɒnəmi","the money and business system of a country","экономика","экономика","When the economy is bad, people save more."],
"statistic":["stəˈtɪstɪk","one number taken from a larger set of figures","статистика","статистический показатель","Here is a statistic that surprises most people."],
"advice":["ədˈvaɪs","an opinion about what somebody should do","кеңес","совет","Can I give you one piece of advice?"],
"decide":["dɪˈsaɪd","to choose one thing after thinking about it","шешу","решить","They decided to send it back."],
"disappointment":["ˌdɪsəˈpɔɪntmənt","the sad feeling when something is worse than you hoped","көңіл қалу","разочарование","It'll be a disappointment to her if we throw it away."],
"benefit":["ˈbenɪfɪt","a good result that something gives you","пайда","польза","The main benefit of writing is that you have a record."],
"equip":["ɪˈkwɪp","to supply somebody with the things they need","жабдықтау","оснастить","The flat was equipped with everything except a kettle."],
"stress":["stres","the feeling of too much pressure and worry","күйзеліс","стресс","Shopping online can also cause stress."],
"stressful":["ˈstresfl","making you feel pressure and worry","күйзелтетін","напряжённый","Complaining on the phone is more stressful than writing."],
"digital":["ˈdɪdʒɪtl","using computers rather than paper","цифрлық","цифровой","Keep a digital copy of the receipt."],
"complain":["kəmˈpleɪn","to say that you are not satisfied","шағымдану","жаловаться","I am writing to complain about an order I received."],
"grater":["ˈɡreɪtə(r)","a metal kitchen tool for cutting food into small pieces","үккіш","тёрка","It's made of metal, and you move the cheese against it."],
"kettle":["ˈketl","a container used for boiling water","шәйнек","чайник","It's used for making water hot."],
"wallet":["ˈwɒlɪt","a small flat case for money and cards","әмиян","бумажник","It's a thing you keep money in."],
"scooter":["ˈskuːtə(r)","a small motorbike","скутер","скутер","My favourite possession is definitely my scooter."],
"get rid of":["ɡet ˈrɪd əv","to remove something you no longer want","құтылу","избавиться","Maybe we could get rid of them?"],
"confident":["ˈkɒnfɪdənt","sure about yourself and not afraid to speak","өзіне сенімді","уверенный в себе","A confident student got more attention than a shy one."],
"shy":["ʃaɪ","nervous with new people and quiet in a group","ұялшақ","застенчивый","She isn't unfriendly — she is just shy."],
"sociable":["ˈsəʊʃəbl","happy with other people and looking for company","көпшіл","общительный","She's a real people person — very sociable."],
"friendly":["ˈfrendli","behaving in a kind and open way","достық ниетті","дружелюбный","Both types can be friendly in different ways."],
"hard-working":["hɑːdˈwɜːkɪŋ","putting a lot of effort into work","еңбекқор","трудолюбивый","Introverts are just as hard-working as extroverts."],
"patient":["ˈpeɪʃnt","able to wait calmly without getting angry","шыдамды","терпеливый","They are usually more patient than extroverts."],
"creative":["kriˈeɪtɪv","good at making new things and new ideas","шығармашыл","творческий","He always comes up with unusual ideas — he's very creative."],
"smart":["smɑːt","clever and quick to understand","ақылды","умный","Being loud is not the same as being smart."],
"stupid":["ˈstjuːpɪd","showing no intelligence or good sense","ақымақ","глупый","A quiet answer is not a stupid answer."],
"romantic":["rəʊˈmæntɪk","showing strong feelings of love","романтикалы","романтичный","He is quiet at work and very romantic at home."],
"extrovert":["ˈekstrəvɜːt","a person who enjoys big groups and attention","экстраверт","экстраверт","We call these people extroverts."],
"introvert":["ˈɪntrəvɜːt","a person who prefers a small group or time alone","интроверт","интроверт","These are introverts — the quiet ones."],
"characteristic":["ˌkærəktəˈrɪstɪk","a typical quality of a person or thing","мінез ерекшелігі","черта характера","Patience is the characteristic people notice last."],
"best-selling":["ˌbestˈselɪŋ","selling a very large number of copies","бестселлер атанған","бестселлерный","Her best-selling book is called Quiet."],
"fair":["feə(r)","treating everybody in an equal, reasonable way","әділ","справедливый","The loudest voice was the most powerful voice. But is that fair?"],
"similar":["ˈsɪmələ(r)","almost the same","ұқсас","похожий","My sister and I are similar — we are both quiet."],
"different":["ˈdɪfrənt","not the same","өзгеше","другой","Other people are different. They think first and speak later."],
"couple":["ˈkʌpl","two people who are married or in a relationship","жұп","пара","He was adopted by an Australian couple from Tasmania."],
"twins":["twɪnz","two children born on the same day to the same mother","егіздер","близнецы","Pati has had her twins — a boy and a girl."],
"stepmother":["ˈstepmʌðə(r)","the woman married to your father who is not your mother","өгей шеше","мачеха","She is married to my father, so she is my stepmother."],
"mother-in-law":["ˈmʌðər ɪn lɔː","your husband's or wife's mother","ене","тёща, свекровь","Your mother-in-law is your husband's or wife's mother."],
"father-in-law":["ˈfɑːðər ɪn lɔː","your husband's or wife's father","қайын ата","тесть, свёкор","He's my husband's father. He's my father-in-law."],
"flatmate":["ˈflætmeɪt","a person you share a flat with","пәтерлес","сосед по квартире","I share a flat with a flatmate called Max."],
"adopt":["əˈdɒpt","to take a child into your family so the child legally becomes yours","бала асырап алу","усыновить","If you take a child into your family, you adopt the child."],
"get divorced":["ɡet dɪˈvɔːst","to legally end your marriage","ажырасу","развестись","You get divorced only if your marriage goes wrong."],
"related":["rɪˈleɪtɪd","in the same family, by birth or by marriage","туыс болып келетін","состоящий в родстве","We have the same surname, but we are not related."],
"separate":["ˈsepəreɪt","to stop living together as a couple","бөлек тұру","разъехаться","His parents decided to separate when he was six."],
"experience":["ɪkˈspɪəriəns","something that happens to you in your life","тәжірибе","опыт, случай из жизни","Finding his mother was the strangest experience of his life."],
"move":["muːv","to go to live in a different place","көшу","переехать","So he moved to Tasmania?"],
"return":["rɪˈtɜːn","to go back to a place","қайта оралу","вернуться","He wanted to return to the village near the waterfall."],
"settle":["ˈsetl","to start living in a place and stay there","орнығу","обосноваться","He went to university and settled in Australia."],
"dishonest":["dɪsˈɒnɪst","not telling the truth","адал емес","нечестный","He never tells the truth — he is completely dishonest."],
"disorganized":["dɪsˈɔːɡənaɪzd","bad at planning; with things in the wrong place","ұйымдаспаған","неорганизованный","She has lost the tickets again. She is so disorganized."],
"impatient":["ɪmˈpeɪʃnt","not able to wait calmly","шыдамсыз","нетерпеливый","Don't be impatient — the answer comes tomorrow."],
"impolite":["ˌɪmpəˈlaɪt","with bad manners","әдепсіз","невежливый","That wasn't very polite. He was a bit impolite."],
"impossible":["ɪmˈpɒsəbl","something that cannot happen","мүмкін емес","невозможный","After four years of searching, it looked impossible."],
"unfair":["ˌʌnˈfeə(r)","not treating everybody equally","әділетсіз","несправедливый","They gave the job to his cousin. That is unfair."],
"unfriendly":["ˌʌnˈfrendli","not warm or open with other people","достық емес","недружелюбный","The new neighbours seem a little unfriendly."],
"unkind":["ˌʌnˈkaɪnd","not kind; a little cruel","мейірімсіз","недобрый","That wasn't very kind. It was a bit unkind."],
"unlucky":["ʌnˈlʌki","having bad luck","сәтсіз","невезучий","He has already taken the test four times. He is very unlucky."],
"unnecessary":["ʌnˈnesəsəri","not needed at all","қажетсіз","ненужный","A second email was unnecessary — I had already replied."],
"unpleasant":["ʌnˈpleznt","not nice; something you do not enjoy","жағымсыз","неприятный","Losing your keys on holiday is an unpleasant experience."],
"unsociable":["ʌnˈsəʊʃəbl","not enjoying the company of other people","көпшіл емес","необщительный","He hasn't come to a single party. People call him unsociable."],
"untidy":["ʌnˈtaɪdi","not tidy; things everywhere","ретсіз","неопрятный","His room is always untidy."],
"necessary":["ˈnesəsəri","needed; that you must have or do","қажет","нужный","Is a second test really necessary?"],
"possible":["ˈpɒsəbl","that can happen or be done","мүмкін","возможный","Is it possible to change the date?"],
"usual":["ˈjuːʒuəl","happening most of the time; normal","әдеттегі","обычный","She was later than usual this morning."],
"quiet":["ˈkwaɪət","making little or no noise; not talking much","тыныш","тихий","If you are the quietest person in your class, that is not a weakness."],
"loud":["laʊd","making a lot of noise","қатты дауысты","громкий","In many offices the loudest voice was the most powerful voice."],
"attention":["əˈtenʃn","the interest that other people give you","назар","внимание","They feel happy when the room is looking at them."],
"weakness":["ˈwiːknəs","a quality that is not strong","әлсіздік","слабость","That is not a weakness. It is a different kind of strength."],
"strength":["streŋθ","a quality that is good and useful","күш","сильная сторона","Your quiet strengths are just as valuable."],
"adopted":["əˈdɒptɪd","taken into a family as their legal child","асырап алынған","усыновлённый","He was adopted by an Australian couple."],
"waterfall":["ˈwɔːtəfɔːl","water falling from a high place","сарқырама","водопад","Then suddenly he recognized a waterfall."],
"congratulations":["kənˌɡrætʃuˈleɪʃnz","what you say to someone who has had good news","құттықтаймын","поздравляю","Congratulations! I'm really happy for you."],
/* ---- Unit 4 vocabulary ---- */
"change career":["tʃeɪndʒ kəˈrɪə","to start doing a completely different job","мамандық ауыстыру","сменить профессию","Nobody in her family had ever changed career at thirty-four."],
"leave home":["liːv həʊm","to stop living with your parents","үйден кету","уехать из родительского дома","She left home for the first time at thirty-four."],
"pass your exams":["pɑːs jɔːr ɪɡˈzæmz","to be successful in your examinations","емтихан тапсыру","сдать экзамены","He passed his exams and then chose the safer subject."],
"get engaged":["ɡet ɪnˈɡeɪdʒd","to agree formally to marry somebody","атастыру","обручиться","They got engaged in the spring."],
"get married":["ɡet ˈmærid","to become somebody's husband or wife","үйлену","пожениться","You do not have to get married before you change direction."],
"have a baby":["hæv ə ˈbeɪbi","to give birth to a child","бала көтеру","родить ребёнка","She went back to studying two years after she had a baby."],
"retire":["rɪˈtaɪə","to stop working, usually because of your age","зейнетке шығу","выйти на пенсию","She retired at sixty-one and immediately got bored."],
"take up":["teɪk ˈʌp","to start a new hobby or activity","айналыса бастау","начать заниматься","Tomas took up the guitar when he was a teenager."],
"deal with":["diːl wɪð","to take action to solve a problem or manage a situation","шешу, айналысу","справляться с","Changing direction means dealing with a year of feeling foolish."],
"perform":["pəˈfɔːm","to play music, act or dance in front of an audience","өнер көрсету","выступать","He now performs in a small concert hall twice a month."],
"middle-aged":["ˌmɪdl ˈeɪdʒd","roughly between forty and sixty years old","орта жастағы","средних лет","Most of the students on the course were middle-aged."],
"in your sixties":["ɪn jɔː ˈsɪkstiz","aged between sixty and sixty-nine","алпыстан асқан","за шестьдесят","In her sixties, she began studying again."],
"conductor":["kənˈdʌktə","the person who stands in front of an orchestra and leads it","дирижёр","дирижёр","Last year she qualified as a conductor."],
"concert hall":["ˈkɒnsət hɔːl","a large building where music is performed","концерт залы","концертный зал","He performs in a small concert hall twice a month."],
"lawyer":["ˈlɔɪə","a person whose job is the law","заңгер","юрист, адвокат","Nadia was a lawyer for eleven years."],
"decade":["ˈdekeɪd","a period of ten years","онжылдық","десятилетие","I didn't want to spend another decade doing something I disliked."],
"orchestra":["ˈɔːkɪstrə","a large group of musicians who play together","оркестр","оркестр","She hopes to lead a full orchestra."],
"qualify":["ˈkwɒlɪfaɪ","to pass the exams that allow you to do a job","біліктілік алу","получить квалификацию","Last year she qualified as a conductor."],
"regret":["rɪˈɡret","to feel sorry about something you did or did not do","өкіну","сожалеть","She has never regretted leaving law."],
"go online":["ɡəʊ ˌɒnˈlaɪn","to start using the internet","интернетке кіру","выходить в интернет","When I get up, I always look at my phone and then go online."],
"log on":["lɒɡ ˈɒn","to enter your name and password so a service knows who you are","жүйеге кіру","входить в аккаунт","She had not logged on for twenty-four hours."],
"download":["ˌdaʊnˈləʊd","to move a file from the internet onto your phone or computer","жүктеп алу","скачивать","He is going to download the magazines before the flight."],
"shop online":["ʃɒp ˌɒnˈlaɪn","to buy things on the internet","интернеттен сатып алу","покупать в интернете","I am not going to shop online after ten at night."],
"social media":["ˌsəʊʃl ˈmiːdiə","the apps where people post things and read each other","әлеуметтік желілер","соцсети","Social media is very important for my job."],
"tweet":["twiːt","to post a short message on social media","твит жазу","публиковать в соцсети","She stopped tweeting for a day and nobody noticed."],
"update":["ˌʌpˈdeɪt","to add the newest information to something","жаңарту","обновлять","I check my email and update my calendar before bed."],
"comment":["ˈkɒment","something somebody writes under your post","пікір","комментарий","I count the likes and read people's comments."],
"share":["ʃeə","to give other people something you have found or made","бөлісу","делиться","He is going to share the photos on the reunion website."],
"receive":["rɪˈsiːv","to get something that somebody sends you","алу","получать","You receive forty messages and answer three."],
"get in touch":["ɡet ɪn ˈtʌtʃ","to speak or write to somebody after a while","хабарласу","связаться","It is much easier to get in touch with people these days."],
"get home":["ɡet ˈhəʊm","to arrive at your own home","үйге жету","добраться домой","I am going to switch the phone off when I get home."],
"arrive":["əˈraɪv","to reach a place at the end of a journey","келу","прибывать","My parents are arriving for lunch on Sunday."],
"switch off":["swɪtʃ ˈɒf","to stop working and stop thinking about work","өшіру, ажырау","отключиться","I never completely switch off and stop thinking about work."],
"waste time":["weɪst ˈtaɪm","to spend time on something with no value","уақытты босқа өткізу","тратить время впустую","I am not going to waste as much time online."],
"moment":["ˈməʊmənt","a very short period of time","сәт","момент","For a moment she did not know what to do with her hands."],
"invite":["ɪnˈvaɪt","to ask somebody to come to something","шақыру","приглашать","I'm calling to invite you to a school reunion."],
"suggest":["səˈdʒest","to put an idea forward for the other person to accept or refuse","ұсыну","предлагать","Could I suggest the 29th instead?"],
"confirm":["kənˈfɜːm","to say again that something is definitely happening","растау","подтверждать","I'll email you nearer the time to confirm it."],
"put off":["pʊt ˈɒf","to move something to a later date","кейінге қалдыру","отложить","They put the dinner off twice before it happened."],
"fit in":["fɪt ˈɪn","to go into the space you have in your week","уақытқа сыю","вписаться в расписание","If that doesn't fit in, I'll come another time."],
"make it":["ˈmeɪk ɪt","to be able to come to something","келе алу","смочь прийти","I'm afraid I can't make it on the 28th."],
"book a table":["bʊk ə ˈteɪbl","to reserve a place in a restaurant","үстел брондау","забронировать столик","Shall I find a nice restaurant and book a table for us?"],
"call back":["kɔːl ˈbæk","to telephone somebody who telephoned you first","кері қоңырау шалу","перезвонить","Thanks for calling back so quickly."],
"miss a call":["mɪs ə ˈkɔːl","to not answer the phone in time","қоңырауды өткізіп алу","пропустить звонок","I'm sorry I missed your call."],
"free":["friː","not busy; also, costing nothing","бос; тегін","свободен; бесплатный","Are you free that week at all?"],
"review":["rɪˈvjuː","what somebody writes about a place or a book to say how good it is","пікір, шолу","отзыв","The reviews of that new place are very good."],
"seafront":["ˈsiːfrʌnt","the part of a town next to the sea","жағалау","набережная","That Georgian place on the seafront."],
"vase":["vɑːz","a container you put flowers in","ваза","ваза","They gave her a vase she did not want."],
"reunion":["riːˈjuːniən","a meeting of people who have not seen each other for a long time","кездесу кеші","встреча выпускников","I'm organizing a school reunion in July."],
"challenge":["ˈtʃælɪndʒ","something new and difficult that you decide to try","сынақ","вызов, испытание","I think this 30-day challenge idea is great."],
"teenager":["ˈtiːneɪdʒə","a person between thirteen and nineteen years old","жасөспірім","подросток","He took up the guitar when he was a teenager."],
"market place":["ˈmɑːkɪt pleɪs","an open area in a town where people buy and sell goods","базар алаңы","рыночная площадь","Every Saturday the market place is full of people."],
"stall":["stɔːl","a small table or stand where one person sells things","сөре, дүңгіршек","прилавок, ларёк","Every day I serve tea at a stall in central Delhi."],
"souvenir seller":["ˌsuːvəˈnɪə selə","a person who sells small things to tourists","кәдесый сатушы","продавец сувениров","The souvenir seller on the corner knows every tourist."],
"pavement artist":["ˈpeɪvmənt ɑːtɪst","an artist who draws on the ground with chalk","асфальт суретшісі","уличный художник","Edgar Mueller is a 3D pavement artist."],
"street performer":["striːt pəˈfɔːmə","a person who entertains a crowd in the street","көше әртісі","уличный артист","A street performer is juggling outside the café."],
"street cleaner":["striːt ˈkliːnə","a person whose job is keeping the streets clean","көше тазалаушы","дворник","Harry Bakewell is a street cleaner from London."],
"pedestrian area":["pəˈdestriən ˈeəriə","a street or square where cars are not allowed","жаяу жүргіншілер аймағы","пешеходная зона","I work in a pedestrian area near the city centre."],
"parking space":["ˈpɑːkɪŋ speɪs","a marked place where you can leave one car","тұрақ орны","парковочное место","We drove round for twenty minutes looking for a parking space."],
"tower block":["ˈtaʊə blɒk","a very tall building containing flats","көпқабатты тұрғын үй","высотный жилой дом","She lives on the fourteenth floor of a tower block."],
"statue":["ˈstætʃuː","a figure of a person or animal made of stone or metal","мүсін","статуя, памятник","There is a bronze statue in the middle of the square."],
"rubbish":["ˈrʌbɪʃ","things people throw away","қоқыс","мусор","We do have a huge problem with rubbish."],
"shopper":["ˈʃɒpə","a person who is out buying things","сатып алушы","покупатель","All the tourists and shoppers — I was blocked."],
"crowded":["ˈkraʊdɪd","uncomfortably full of people","адамға толы","переполненный","It's crowded and noisy, but it's my job."],
"lively":["ˈlaɪvli","full of energy and activity, in a good way","жанды, қызу","оживлённый","I work in a very lively neighbourhood."],
"dull":["dʌl","boring, with nothing interesting happening","көңілсіз","скучный, унылый","There's plenty to do, so it's never dull!"],
"narrow":["ˈnærəʊ","very small from one side to the other","тар","узкий","The old town is a set of narrow streets."],
"maze":["meɪz","a confusing set of paths or streets where you get lost","лабиринт","лабиринт","This city's like a maze — I always get lost."],
"neighbourhood":["ˈneɪbəhʊd","the area around where you live","маңай","район, окрестности","I work in a very lively neighbourhood."],
"pavement":["ˈpeɪvmənt","the hard path at the side of a road for people to walk on","тротуар","тротуар","People drop their rubbish on the pavement."],
"bin":["bɪn","a container for rubbish","қоқыс жәшігі","урна, мусорный бак","…instead of putting it in the bin."],
"sheet":["ʃiːt","the flat piece of cloth you lie on in bed","жаймалық","простыня","The Egyptian cotton sheets on the bed are wonderful."],
"duvet":["ˈduːveɪ","a thick soft cover filled with feathers that you sleep under","көрпе","одеяло","I'm still missing certain things from home — even my duvet!"],
"towel":["ˈtaʊəl","a piece of thick cloth you use to dry yourself","орамал","полотенце","I love the candles and the soft, white towels."],
"cloth":["klɒθ","a small piece of fabric used for cleaning","шүберек","тряпка","I can't find his cleaning stuff, not even a cloth."],
"wardrobe":["ˈwɔːdrəʊb","a tall cupboard where you hang your clothes","киім шкафы","шкаф для одежды","There's nowhere to put my clothes — no wardrobe."],
"chest of drawers":["ˌtʃest əv ˈdrɔːz","a low piece of furniture with drawers for clothes","тартпалы жәшік","комод","No wardrobe or chest of drawers in the bedroom."],
"wash basin":["ˈwɒʃ beɪsn","the bowl in a bathroom where you wash your hands","қолжуғыш","раковина","The wash basin looks like a sheet of paper."],
"tap":["tæp","the metal fitting that water comes out of","кран","кран","At first I couldn't even work the taps!"],
"pan":["pæn","a metal container with a handle for cooking on a stove","кәстрөл","кастрюля","I put a pan of water on and waited."],
"microwave oven":["ˈmaɪkrəweɪv ˈʌvn","a small electric oven that heats food very quickly","қысқа толқынды пеш","микроволновая печь","They don't have a proper cooker, just a microwave oven."],
"rug":["rʌɡ","a small soft covering for part of a floor","кілемше","коврик","There are no carpets, just white rugs everywhere."],
"mirror":["ˈmɪrə","a piece of glass in which you can see yourself","айна","зеркало","They don't have any mirrors — very strange!"],
"candle":["ˈkændl","a stick of wax with a wick that gives light when it burns","шам","свеча","I love all the candles in the bathroom."],
"dustpan and brush":["ˈdʌstpæn ən brʌʃ","a small flat pan and hand brush for sweeping up dirt","күрекше мен щётка","совок и щётка","I can't find a cloth or a dustpan and brush."],
"satellite dish":["ˈsætəlaɪt dɪʃ","a round dish on a wall that receives television signals","жерсерік антеннасы","спутниковая антенна","I miss satellite TV with all the channels."],
"cctv camera":["ˌsiːsiːtiːˈviː ˈkæmərə","a camera that watches a place and records what happens","бақылау камерасы","камера видеонаблюдения","A small cctv camera watches the front door."],
"shop display":["ˈʃɒp dɪspleɪ","the arrangement of goods in a shop window","дүкен витринасы","витрина","The shop display is changed every week."],
"collect":["kəˈlekt","to gather things of one kind over a long time","жинау","коллекционировать","The owners collect old maps."],
"destroy":["dɪˈstrɔɪ","to damage something so badly that it cannot be used","бүлдіру","уничтожить, испортить","Please do not destroy the rugs — they are very old."],
"strange":["streɪndʒ","unusual and hard to explain","оғаш","странный","They don't have any mirrors — very strange!"],
"house-sit":["ˈhaʊs sɪt","to look after someone's home while they are away","үй күту","присматривать за домом","It's my first experience of house-sitting."],
"crossroads":["ˈkrɒsrəʊdz","a place where two roads cross each other","қиылыс","перекрёсток","Keep going until you reach a crossroads."],
"roundabout":["ˈraʊndəbaʊt","a circular junction that traffic drives around","айналма қозғалыс","круговое движение","Turn left at the George Roundabout."],
"opposite":["ˈɒpəzɪt","directly across from something","қарсы бетте","напротив","My block is opposite the pharmacy."],
"turning":["ˈtɜːnɪŋ","a road that leads off another road","бұрылыс","поворот","Take the second turning on the left."],
"cross":["krɒs","to go from one side of something to the other","қиып өту","переходить","Cross the road at the zebra crossing."],
"lane":["leɪn","one of the marked strips a road is divided into","жолақ","полоса движения","He overtook us in the fast lane."],
"fast lane":["ˈfɑːst leɪn","the outside lane of a motorway, used for overtaking","жылдам жолақ","крайняя полоса для обгона","He was in the fast lane doing ninety."],
"house swap":["ˈhaʊs swɒp","an arrangement where two families exchange homes","үй алмасу","обмен домами","They found the flat on a house swap website."],
"navigation":["ˌnævɪˈɡeɪʃn","the process of finding and following a route","навигация","навигация","If you get lost, just use the navigation on your phone."],
"solution":["səˈluːʃn","a way of solving a problem","шешім","решение","A phone map is the easy solution."],
"pharmacy":["ˈfɑːməsi","a shop where you buy medicine","дәріхана","аптека","My block is opposite the pharmacy."],
"landmark":["ˈlændmɑːk","a building or feature that helps you find your way","бағдар","ориентир","Give a landmark after each turn."],
"reception":["rɪˈsepʃn","the desk near the entrance where visitors arrive","қабылдау бөлмесі","стойка регистрации","It's in the corner on the left by reception."],
"terrace":["ˈterəs","a flat outdoor area next to a building","терраса","терраса","You're on the terrace now."],
"on the corner":["ɒn ðə ˈkɔːnə","at the point where two streets meet","бұрышта","на углу","Green door on the corner. You can't miss it!"],
"take the second turning":["teɪk ðə ˈsekənd ˈtɜːnɪŋ","go past the first side road and turn into the next one","екінші бұрылысқа бұрылу","повернуть на втором повороте","Go past the supermarket and take the second turning on the left."],
"go past":["ɡəʊ ˈpɑːst","to move by something and keep going","жанынан өту","пройти мимо","Go past the shopping centre and keep going."],
"on the way":["ɒn ðə ˈweɪ","during a journey to somewhere","жол-жөнекей","по дороге","I'll buy some bread on the way home."],
"climb":["klaɪm","to go up something using your hands and feet","өрмелеп шығу","подниматься, забираться","He climbed into that capsule anyway."],
"dive":["daɪv","to go down through air or water with your head first","сүңгу","нырять, пикировать","He got into the correct diving position."],
"drop":["drɒp","to let something fall, or to move something down quickly","түсіру","ронять; опускать","He dropped his head and the turning stopped."],
"fall":["fɔːl","to go down towards the ground, usually by accident","құлау","падать","He fell towards the desert faster and faster."],
"jump":["dʒʌmp","to push yourself off the ground or off a high place","секіру","прыгать","He jumped at 5.37 p.m."],
"land":["lænd","to come down onto the ground at the end of a flight or a jump","қону","приземляться","He landed on his feet in the desert."],
"lift":["lɪft","to move something or someone to a higher place","көтеру","поднимать","The balloon lifted him for two and a half hours."],
"take off":["ˌteɪk ˈɒf","to leave the ground and start to fly","ұшып көтерілу","взлетать","The plane took off forty minutes late."],
"pull out":["ˌpʊl ˈaʊt","to get yourself out of a difficult or dangerous position","суырып шығу","выйти, выбраться","Baumgartner pulled out of the spin himself."],
"parachute":["ˈpærəʃuːt","a large piece of cloth that lets you fall safely from the sky","парашют","парашют","Four minutes later his parachute opened."],
"balloon":["bəˈluːn","a very large bag filled with gas that can carry people into the air","әуе шары","воздушный шар","At sunrise the balloon went up over the desert."],
"capsule":["ˈkæpsjuːl","the small closed part of a spacecraft where a person sits","капсула","капсула","Inside the capsule sat Felix Baumgartner."],
"rescue team":["ˈreskjuː tiːm","a group of people whose job is to help someone in danger","құтқару тобы","спасательная команда","The rescue team reached him in ninety seconds."],
"achievement":["əˈtʃiːvmənt","something difficult that you succeeded in doing","жетістік","достижение","That is what an achievement looks like from the ground."],
"skydiving":["ˈskaɪdaɪvɪŋ","the sport of jumping from a plane and falling before opening a parachute","аспаннан секіру","скайдайвинг","The rest of his skydiving team watched the screens."],
"enormous":["ɪˈnɔːməs","very, very big","орасан зор","огромный","It was enormous, and thinner than a plastic bag."],
"curve":["kɜːv","a line that bends smoothly","иіліс","изгиб, дуга","On my screen I saw the curve of the Earth."],
"reach":["riːtʃ","to arrive at a place or a person","жету","добраться, достичь","The rescue team reached him in ninety seconds."],
"breathe":["briːð","to take air into your body and let it out again","дем алу","дышать","I did not breathe."],
"desert":["ˈdezət","a large dry area of land with very little water","шөл","пустыня","He landed on his feet in the desert."],
"spin":["spɪn","a fast turning movement you cannot control","айналу","штопор, вращение","Baumgartner pulled out of the spin himself."],
"edge":["edʒ","the part at the end of something, where it stops","шет","край","the pilot who wanted to jump from the edge of space"],
"sunrise":["ˈsʌnraɪz","the time in the morning when the sun appears","таң ату","восход солнца","At sunrise the balloon went up over the desert."],
"danger":["ˈdeɪndʒə","the possibility that something bad will happen","қауіп","опасность","did he know he was in danger?"],
"knee":["niː","the joint in the middle of your leg","тізе","колено","he fell onto his knees"],
"backwards":["ˈbækwədz","in the direction behind you","артқа","назад","He pushed his arms backwards, like Superman."],
"forwards":["ˈfɔːwədz","in the direction in front of you","алға","вперёд","He moved forwards onto the step."],
"towards":["təˈwɔːdz","in the direction of someone or something","қарай","по направлению к","He fell towards the desert."],
"through":["θruː","from one side or end of something to the other","арқылы","сквозь, через","The parachute took him down through the clouds."],
"angry":["ˈæŋɡri","feeling strong bad emotion because of something unfair or annoying","ашулы","злой, рассерженный","She just looked at me angrily."],
"anxious":["ˈæŋkʃəs","worried about something that might happen later","уайымды","тревожный","In small spaces we feel anxious."],
"confused":["kənˈfjuːzd","not able to follow or understand what is happening","сасқан","растерянный","I was completely confused about which floor we were on."],
"embarrassed":["ɪmˈbærəst","uncomfortable because other people saw something","ұялған","смущённый","Everybody was looking at us. I was so embarrassed!"],
"excited":["ɪkˈsaɪtɪd","very happy and full of energy about something good","қуанышты толқыған","радостно взволнованный","Yes! I'm on holiday! I was so excited."],
"exhausted":["ɪɡˈzɔːstɪd","with no energy left at all","қалжыраған","обессиленный","After a twelve-hour shift she was exhausted."],
"frightened":["ˈfraɪtnd","afraid of something that is happening now","қорыққан","испуганный","They're coming towards us! I was really frightened."],
"guilty":["ˈɡɪlti","feeling bad because you did something wrong","кінәлі","виноватый","It was Jake's birthday and I forgot. Now I feel guilty."],
"nervous":["ˈnɜːvəs","worried and tense just before something important","қобалжыған","нервничающий","We act in a way that stops other people feeling nervous."],
"pleased":["pliːzd","quietly happy because something went well","риза","довольный","She was pleased with the result."],
"stressed":["strest","under too much pressure, with too much to do","күйзелген","в стрессе","I was stressed about the meeting all morning."],
"behaviour":["bɪˈheɪvjə","the way a person or group acts","мінез-құлық","поведение","If you watch people in lifts, you'll see interesting behaviour."],
"eye contact":["ˈaɪ kɒntækt","looking directly into someone else's eyes","көзбен байланыс","зрительный контакт","They never make eye contact with the other people."],
"intercom":["ˈɪntəkɒm","a speaker system you use to talk to someone in another place","іштей байланыс құрылғысы","переговорное устройство","I pressed the intercom and waited."],
"headphones":["ˈhedfəʊnz","a pair of small speakers you wear over your ears","құлаққап","наушники","He was wearing headphones and looking at the floor."],
"angrily":["ˈæŋɡrəli","in an angry way","ашулы түрде","сердито","She just looked at me angrily."],
"calmly":["ˈkɑːmli","in a calm and quiet way","байсалды","спокойно","He answered calmly."],
"politely":["pəˈlaɪtli","in a polite way","сыпайы","вежливо","Some people say hello politely."],
"quietly":["ˈkwaɪətli","without much noise","ақырын","тихо","They started speaking quietly."],
"smartly":["ˈsmɑːtli","wearing tidy, formal clothes","ұқыпты киінген","элегантно, опрятно","She was dressed quite smartly."],
"fluently":["ˈfluːəntli","speaking a language easily and well","еркін","бегло","He speaks three languages fluently."],
"corner":["ˈkɔːnə","the point where two walls or sides meet","бұрыш","угол","If there are two people, you stand in opposite corners."],
"triangle":["ˈtraɪæŋɡl","a shape with three straight sides","үшбұрыш","треугольник","A third person enters and you make a triangle."],
"strangely":["ˈstreɪndʒli","in an unusual way","оғаш","странно","When another person comes in, we behave strangely."],
"in a good mood":["ɪn ə ˌɡʊd ˈmuːd","feeling happy and relaxed, so that everything seems fine","көңіл күйі жақсы","в хорошем настроении","He walked to work in a good mood."],
"mood":["muːd","the way you feel at a particular time","көңіл күй","настроение","He was in a good mood all morning."],
"nightmare":["ˈnaɪtmeə","a very bad or frightening experience","қорқынышты жағдай","кошмар","Four hours late and soaking wet — what a nightmare!"],
"stranger":["ˈstreɪndʒə","a person you do not know","бейтаныс адам","незнакомец","A stranger came over and asked for directions."],
"traveller":["ˈtrævlə","a person who goes on long journeys","саяхатшы","путешественник","She is a frequent traveller."],
"reader":["ˈriːdə","a person who reads a lot","оқырман","читатель","He is a slow reader, but he finishes every book."],
"runner":["ˈrʌnə","a person who runs, usually for sport","жүгіруші","бегун","As a long-distance runner, she trains every day."],
"walker":["ˈwɔːkə","a person who goes on foot for pleasure","жаяу серуендеуші","любитель пеших прогулок","My grandfather is a keen walker."],
"avoid":["əˈvɔɪd","to keep away from something, or stop it happening","болдырмау","избегать, объезжать","The pilot needed to avoid a plane on the runway."],
"carton":["ˈkɑːtn","a small cardboard container for a drink","қорап","пакет, картонная упаковка","It was one of those little cartons of juice."],
"straw":["strɔː","a thin tube you drink through","түтікше","трубочка","The straw jumped out of my mouth."],
"blouse":["blaʊz","a shirt worn by a woman","блузка","блузка","She was wearing a white blouse and a skirt."],
"runway":["ˈrʌnweɪ","the long flat road a plane uses to take off and land","ұшу-қону жолағы","взлётно-посадочная полоса","A plane was stuck in the middle of the runway."],
"announcement":["əˈnaʊnsmənt","an official spoken message to a group of people","хабарландыру","объявление","The pilot made an announcement."],
"directions":["dəˈrekʃnz","instructions telling you how to get somewhere","бағыт-бағдар","указания как пройти","A man asked for directions to the station."],
"guard":["ɡɑːd","the person in charge of a train","пойыз жүргізушісінің көмекшісі","проводник, кондуктор","Then the guard came through."],
"dessert":["dɪˈzɜːt","the sweet course at the end of a meal","тәтті тағам","десерт","Everybody was eating dessert."],
"cold":["kəʊld","at a low temperature","суық","холодный","I don't mind the cold."],
"hot":["hɒt","at a high temperature","ыстық","жаркий","It is hot, and it is a nasty period for a trip."],
"light":["laɪt","brightness from the sun or a lamp","жарық","свет","The light is beautiful in October."],
"season":["ˈsiːzn","one of the four parts of the year: spring, summer, autumn, winter","маусым","время года","It is our most pleasant season."],
"festival":["ˈfestɪvl","a public celebration, often with music and food","мереке","праздник","Every park turns into a festival."],
"trip":["trɪp","a journey to a place and back again","сапар","поездка","a nasty period for a trip"],
"humid":["ˈhjuːmɪd","hot with a lot of water in the air, so the air feels heavy","ылғалды","влажный и душный","damp, cloudy and very humid"],
"damp":["dæmp","slightly wet, in an unpleasant way","дымқыл","сырой","It is damp and cloudy."],
"cloudy":["ˈklaʊdi","with a lot of cloud, so you cannot see the sun","бұлтты","облачный","damp, cloudy and very humid"],
"pleasant":["ˈpleznt","nice and enjoyable","жағымды","приятный","our most pleasant season"],
"uncomfortable":["ʌnˈkʌmftəbl","not relaxed; unpleasant to be in","қолайсыз","некомфортный","many visitors find it uncomfortable"],
"nasty":["ˈnɑːsti","very unpleasant or bad","жағымсыз","скверный","a nasty period for a trip"],
"snowfall":["ˈsnəʊfɔːl","snow that falls, or the amount that falls","қар жауу","снегопад","the snowfall in our mountains"],
"period":["ˈpɪəriəd","a length of time","кезең","период","a nasty period for a trip"],
"lightning":["ˈlaɪtnɪŋ","the bright flash in the sky during a storm","найзағай","молния","often with thunder and lightning"],
"pleasure":["ˈpleʒə","a feeling of enjoyment, or something that gives it","рахат","удовольствие","one of the great pleasures of living here"],
"keen":["kiːn","<i>be keen on</i> = like something quite a lot","құмар, ынталы","увлечённый","I'm not keen on swimming in the sea."],
"mind":["maɪnd","<i>don't mind</i> = be happy enough about; not be bothered","қарсы емес","не против","I don't mind cold weather."],
"stand":["stænd","<i>can't stand</i> = hate; be unable to accept","шыдай алмау","терпеть не могу","I can't stand large crowds."],
"prefer":["prɪˈfɜː","to like one thing more than another","артық көру","предпочитать","I prefer spring weather to summer weather."],
"blossom":["ˈblɒsəm","the flowers on a fruit tree","гүл","цвет, цветение","the cherry blossom in Tokyo"],
"umbrella":["ʌmˈbrelə","the thing you carry to keep the rain off","қолшатыр","зонт","I don't mind carrying an umbrella."],
"typhoon":["taɪˈfuːn","a very strong tropical storm","тайфун","тайфун","three typhoons a month come near us"],
"thunder":["ˈθʌndə","the loud noise in the sky during a storm","күн күркірі","гром","often with thunder and lightning"],
"crowd":["kraʊd","a large number of people in one place","көпшілік, топ","толпа","I can't stand large crowds."],
"visitor":["ˈvɪzɪtə","a person who comes to a place for a short time","келуші, қонақ","посетитель","many visitors find it uncomfortable"],
"honest":["ˈɒnɪst","saying what is true, even if it is not nice","шыншыл","честный","here is my honest answer"],
"avoid":["əˈvɔɪd","to stay away from something on purpose","болдырмау, аулақ болу","избегать","Avoid the first week of May."],
"worth":["wɜːθ","<i>it's worth</i> = it is good enough to be done","тұрарлық","стоит того","It's worth the journey."],
"photography":["fəˈtɒɡrəfi","the art of taking pictures","фотография","фотография","I'm really interested in photography."],
"fishing":["ˈfɪʃɪŋ","the activity of catching fish","балық аулау","рыбалка","My favourite winter activity is fishing."],
"exercise":["ˈeksəsaɪz","physical activity that you do to stay healthy","дене жаттығуы","физические упражнения","His work is exercise."],
"gym":["dʒɪm","a building with equipment for physical exercise","спортзал","спортзал","He never goes to the gym."],
"running":["ˈrʌnɪŋ","the activity of moving fast on your feet","жүгіру","бег","He gave up running years ago."],
"swimming":["ˈswɪmɪŋ","the activity of moving through water","жүзу","плавание","She goes swimming twice a week."],
"chess":["tʃes","a board game for two players","шахмат","шахматы","He plays chess online."],
"camping":["ˈkæmpɪŋ","staying outdoors in a tent","шатырмен демалыс","поход с палаткой","He goes camping once a year."],
"housework":["ˈhaʊswɜːk","the cleaning and tidying you do at home","үй шаруасы","работа по дому","She does the housework on her days off."],
"homework":["ˈhəʊmwɜːk","school work you do at home","үй тапсырмасы","домашнее задание","She helps her son with his homework."],
"to-do list":["tə ˈduː lɪst","a written list of the things you must do","істер тізімі","список дел","He writes a to-do list every morning."],
"spend time":["spend taɪm","to use your hours doing something","уақыт өткізу","проводить время","He spends most of the day outdoors."],
"stay in":["steɪ ɪn","to remain at home instead of going out","үйде қалу","остаться дома","She stays in with her family."],
"indoors":["ˌɪnˈdɔːz","inside a building","үй ішінде","в помещении","He works indoors all day."],
"outdoors":["ˌaʊtˈdɔːz","outside, not in a building","далада","на улице","He spends most of the day outdoors."],
"meal":["miːl","the food you eat at one time, such as lunch","тамақ","приём пищи","She hardly ever eats a proper meal at work."],
"early":["ˈɜːli","before the usual time","ерте","рано","He gets up early, always."],
"late":["leɪt","after the usual time","кеш","поздно","Dias often works late."],
"always":["ˈɔːlweɪz","every time, 100%","әрқашан","всегда","He always gets up at half past four."],
"usually":["ˈjuːʒuəli","most of the time, but not every time","әдетте","обычно","She usually takes fruit to work."],
"often":["ˈɒfn","many times, but not most times","жиі","часто","He often forgets to stop."],
"sometimes":["ˈsʌmtaɪmz","on some occasions","кейде","иногда","He sometimes thinks about the weather."],
"occasionally":["əˈkeɪʒnəli","not often; now and then","анда-санда","изредка","He occasionally gets an idea."],
"rarely":["ˈreəli","almost never","сирек","редко","She rarely sleeps well."],
"hardly ever":["ˈhɑːdli ˈevə","almost never","мүлдем дерлік емес","почти никогда","She hardly ever eats a proper meal."],
"never":["ˈnevə","at no time, 0%","ешқашан","никогда","He never goes to the gym."],
"routine":["ruːˈtiːn","the things you normally do every day","күнделікті тәртіп","распорядок дня","Three people, three routines."],
"shift":["ʃɪft","a period of working time, for example 7pm to 7am","ауысым","смена","She starts her shift at seven."],
"nurse":["nɜːs","a person who looks after ill people in hospital","медбике","медсестра","Aliya is a night nurse."],
"freelancer":["ˈfriːlɑːnsə","a person who works for themselves, not for one company","фрилансер","фрилансер","Dias is a freelancer."],
"farmer":["ˈfɑːmə","a person who grows food or keeps animals","фермер","фермер","Ruslan is a farmer."],
"proper":["ˈprɒpə","real and complete, of the right kind","нағыз, дұрыс","полноценный","a proper meal"],
"straight":["streɪt","directly, with no stop on the way","тікелей","прямо, сразу","She goes straight to bed."],
"forget":["fəˈɡet","to fail to remember or to do something","ұмыту","забывать","He often forgets to stop."],
"novelist":["ˈnɒvəlɪst","a person who writes novels","жазушы, романист","романист","the Japanese novelist Haruki Murakami"],
"marathon":["ˈmærəθən","a running race of about 42 kilometres","марафон","марафон","He does one marathon every year."],
"triathlon":["traɪˈæθlən","a race with swimming, cycling and running","триатлон","триатлон","He does triathlons."],
"goal":["ɡəʊl","something you want to achieve","мақсат","цель","He wants to achieve his own goals."],
"fit":["fɪt","healthy and strong from exercise","дене бітімі мықты","в хорошей форме","It is about keeping fit."],
/* --- target wordlist (Unit 1, Lesson 1) --- */
"busy":["ˈbɪzi","having a lot of things to do","бос емес, жұмысы көп","занятой","I'm really busy this week."],
"family":["ˈfæməli","a group of people who are related to each other","отбасы","семья","The first question is usually about family."],
"relative":["ˈrelətɪv","a member of your wider family, such as an uncle or a cousin","туыс","родственник","Every relative in my phone is in one group chat."],
"relationship":["rɪˈleɪʃnʃɪp","the way two people know and treat each other","қарым-қатынас","отношения","A good relationship starts with a real question."],
"work":["wɜːk","the job you do to earn money","жұмыс","работа","It started as a dream and it became my work."],
"dream":["driːm","something you want very much for the future","арман","мечта","It started as a dream."],
"promise":["ˈprɒmɪs","when you say you will definitely do something","уәде","обещание","I made a promise to myself."],
"chat":["tʃæt","a friendly conversation, or an online message group","чат, әңгіме","чат, беседа","We're all in one group chat."],
"text":["tekst","to send someone a written message on a phone","хабарлама жазу","писать сообщение","I text my sister every evening."],
"blog":["blɒɡ","a website where one person writes regularly","блог","блог","I write a post for a blog."],
"post":["pəʊst","a piece of writing published online","жазба, пост","публикация, пост","I write a short post about each book."],
"reviewer":["rɪˈvjuːə","a person who reads or watches something and gives an opinion on it","шолушы, сыншы","рецензент","I'm a reviewer for a book blog."],
"psychologist":["saɪˈkɒlədʒɪst","a person who studies how the mind works","психолог","психолог","I'm a psychologist, so I ask questions all day."],
"record":["rɪˈkɔːd","to write something down so that you keep it","жазып алу","записывать","When they record their week, it's the same three things."],

/* --- reading text --- */
"stranger":["ˈstreɪndʒə","a person you do not know","бейтаныс адам","незнакомец","Two strangers sat in a room."],
"experiment":["ɪkˈsperɪmənt","a careful scientific test to find something out","тәжірибе","эксперимент","Aron tried an experiment."],
"personal":["ˈpɜːsənl","about your own private life and feelings","жеке, дербес","личный","Each set was more personal."],
"shallow":["ˈʃæləʊ","not deep; staying on the surface","үстірт","поверхностный","one shallow conversation and one deep one"],
"deep":["diːp","going far below the surface; serious and meaningful","терең","глубокий","They preferred the deep conversation."],
"prefer":["prɪˈfɜː","to like one thing more than another","артық көру","предпочитать","Most people preferred the deep conversation."],
"researcher":["rɪˈsɜːtʃə","a person whose job is to study something carefully","зерттеуші","исследователь","Other researchers asked 1,800 people."],
"pair":["peə","two people or things together","жұп","пара","Each pair had forty-five minutes."],
"close":["kləʊs","having a strong warm connection with someone","жақын","близкий","They felt close to a stranger."],
"laboratory":["ləˈbɒrətri","a room where scientific work is done","зертхана","лаборатория","The questions worked in a laboratory."],
"guest":["ɡest","a person you invite","қонақ","гость","Who is your dream dinner guest?"],
"cry":["kraɪ","to produce tears because you feel something strongly","жылау","плакать","When did you last cry?"],
"married":["ˈmærid","joined as husband and wife","үйленген","женатый, замужем","One pair later got married."],
"weather":["ˈweðə","the rain, sun, wind and temperature outside","ауа райы","погода","Why do we chat about the weather?"],
"agree":["əˈɡriː","to say yes to something, or to have the same opinion","келісу","соглашаться","They had agreed to take part."],
"always":["ˈɔːlweɪz","every time; on all occasions","әрқашан","всегда","People always ask me the same thing."],
"same":["seɪm","not different","сол, бірдей","тот же, одинаковый","They ask me the same thing."],
"ask":["ɑːsk","to say something as a question","сұрау","спрашивать","People always ask me what I do."],
"answer":["ˈɑːnsə","what you say or write when someone asks you something","жауап","ответ","I don't have a good answer."],
"question":["ˈkwestʃən","a sentence that asks for information","сұрақ","вопрос","The first question is about family."],
"short":["ʃɔːt","not long","қысқа","короткий","I write a short post."],
"read":["riːd","to look at words and understand them","оқу","читать","I read new books."],
"write":["raɪt","to make words on paper or a screen","жазу","писать","I write a post every week."],
"each":["iːtʃ","every one of two or more things, seen separately","әрқайсысы","каждый","A post about each one."],
"then":["ðen","after that","содан кейін","потом, затем","Then they ask how long."],
"become":["bɪˈkʌm","to start to be something","айналу, болу","становиться","It became my work."],
"start":["stɑːt","to begin","бастау","начинать(ся)","It started as a dream."],
"usually":["ˈjuːʒuəli","most of the time, but not always","әдетте","обычно","The first question is usually about family."],
"brother":["ˈbrʌðə","a boy or man with the same parents as you","аға, іні","брат","Do you have brothers or sisters?"],
"sister":["ˈsɪstə","a girl or woman with the same parents as you","апа, қарындас","сестра","Do you have brothers or sisters?"],
"phone":["fəʊn","a device you use to call or message people","телефон","телефон","Every relative is in my phone."],
"group":["ɡruːp","a number of people or things together","топ","группа","We're in one group chat."],
"never":["ˈnevə","not at any time","ешқашан","никогда","It never stops."],
"stop":["stɒp","to finish moving or happening","тоқтау","останавливаться","It never stops."],
"wife":["waɪf","the woman a man is married to","әйелі","жена","My wife asks me why."],
"look":["lʊk","to turn your eyes towards something","қарау","смотреть","Why are you looking at your phone?"],
"again":["əˈɡen","one more time","тағы, қайта","снова","Why are you looking at your phone again?"],
"myself":["maɪˈself","me, and nobody else","өзіме","себе, самому себе","I made a promise to myself."],
"weekend":["ˌwiːkˈend","Saturday and Sunday","демалыс күндері","выходные","What did you do at the weekend?"],
"everything":["ˈevriθɪŋ","all things","бәрі","всё","That question tells you everything."],
"week":["wiːk","seven days","апта","неделя","When they record their week…"],
"sleep":["sliːp","to rest with your eyes closed at night","ұйқы, ұйықтау","сон, спать","Sleep, food, friends."],
"food":["fuːd","what people eat","тамақ","еда","Sleep, food, friends."],
"friend":["frend","a person you like and know well","дос","друг","Sleep, food, friends."],
"surprise":["səˈpraɪz","to make someone feel something they did not expect","таң қалдыру","удивлять","It surprises them every time."],
"city":["ˈsɪti","a large town","қала","город","Three people, three cities."],
"idea":["aɪˈdɪə","a thought or a plan","идея, ой","идея","Three cities, one idea."],
"colleague":["ˈkɒliːɡ","a person you work with","әріптес","коллега","A relationship with a colleague."],
"neighbour":["ˈneɪbə","a person who lives near you","көрші","сосед","A relationship with a neighbour."],
"anyone":["ˈeniwʌn","any person","кез келген адам","кто угодно","With a colleague, a neighbour, anyone."],
"real":["rɪəl","true and not pretended","шынайы","настоящий","Someone asking a real question."],
"listen":["ˈlɪsn","to pay attention to a sound","тыңдау","слушать","…and then listening to the answer."],
"whole":["həʊl","complete; all of it","бүкіл, тұтас","целый, весь","Listening to the whole answer."],
"hard":["hɑːd","difficult","қиын","трудный","The listening is the hard part."],
"part":["pɑːt","one piece of something bigger","бөлік","часть","The listening is the hard part."],
"wait":["weɪt","to stay somewhere until something happens","күту","ждать","Most people wait for their turn."],
"turn":["tɜːn","the time when it is your chance to do something","кезек","очередь","They wait for their turn to speak."],
"speak":["spiːk","to say words","сөйлеу","говорить","…their turn to speak."],
"instead":["ɪnˈsted","in place of something else","орнына","вместо","…instead of hearing the answer."],
"hear":["hɪə","to notice a sound with your ears","есту","слышать","…instead of hearing the answer."],
"single":["ˈsɪŋɡl","only one","жалғыз, бір ғана","один, единственный","A single follow-up question changes it."],
"change":["tʃeɪndʒ","to make something different","өзгерту","менять","It changes the conversation."],
"conversation":["ˌkɒnvəˈseɪʃn","a talk between two or more people","әңгіме","разговор","…into a real conversation."],
"museum":["mjuˈziːəm","a building where you can see old or interesting things","мұражай","музей","Do you enjoy going to museums?"],
"enjoy":["ɪnˈdʒɔɪ","to like doing something","ұнату, рахат алу","получать удовольствие","Do you enjoy going to museums?"],
"appointment":["əˈpɔɪntmənt","an arranged time to meet someone","кездесу уақыты","встреча (по записи)","Are you late for appointments?"],
"late":["leɪt","after the right time","кеш","поздно, опоздавший","How often are you late?"],
"tired":["ˈtaɪəd","needing rest or sleep","шаршаған","уставший","Are you tired today?"],
"spend":["spend","to use time or money","жұмсау","тратить, проводить","How much time do you spend online?"],
"fun":["fʌn","enjoyment; a good time","көңілді, қызық","веселье","When did you last have fun?"],
"music":["ˈmjuːzɪk","sounds made by voices or instruments","музыка","музыка","What kind of music do you listen to?"],
"kind":["kaɪnd","a type or sort of something","түр","вид, тип","What kind of music?"],

/* --- lesson people, places, extras --- */
"university":["ˌjuːnɪˈvɜːsəti","a place where you study after school","университет","университет","At university I studied economics."],
"economics":["ˌiːkəˈnɒmɪks","the study of money, trade and industry","экономика","экономика","I studied economics."],
"study":["ˈstʌdi","to learn about a subject","оқу, зерттеу","изучать","I studied economics."],
"count":["kaʊnt","to say numbers in order to find a total","санау","считать","Last night I counted forty messages."],
"message":["ˈmesɪdʒ","a piece of written or spoken information you send","хабарлама","сообщение","Forty messages before breakfast."],
"breakfast":["ˈbrekfəst","the first meal of the day","таңғы ас","завтрак","…before breakfast."],
"keep":["kiːp","to continue to have or do something","сақтау, ұстау","хранить, соблюдать","I have kept it for six days."],

/* --- instructions and task language --- */
"choose":["tʃuːz","to decide which one you want","таңдау","выбирать","Choose the correct helping verb."],
"correct":["kəˈrekt","right; with no mistakes","дұрыс","правильный","Choose the correct word."],
"wrong":["rɒŋ","not correct","қате, дұрыс емес","неправильный","One word is wrong."],
"match":["mætʃ","to put two things together that belong together","сәйкестендіру","соединять, сопоставлять","Match each word to its meaning."],
"meaning":["ˈmiːnɪŋ","what a word or sentence says or shows","мағына","значение","Match the word to its meaning."],
"complete":["kəmˈpliːt","to add what is missing","толықтыру","дополнять, завершать","Complete the sentences."],
"sentence":["ˈsentəns","a group of words that makes a complete idea","сөйлем","предложение","Complete the sentence."],
"type":["taɪp","to write using a keyboard","теру","печатать, вводить","Type the correct word."],
"click":["klɪk","to press a button on a mouse","басу","нажимать","Click a card."],
"order":["ˈɔːdə","the way things are arranged, one after another","реті, тәртіп","порядок","Put them in the order you hear."],
"missing":["ˈmɪsɪŋ","not there; needed but absent","жетіспейтін","отсутствующий","Type the two missing words."],
"past":["pɑːst","the time before now","өткен шақ","прошедшее время","Two questions are about the past."],
"present":["ˈpreznt","the time now","осы шақ","настоящее время","Present or past?"],
"true":["truː","right; agreeing with the facts","шын, дұрыс","верно","True or false?"],
"false":["fɔːls","not true","жалған, дұрыс емес","неверно","True or false?"],
"main":["meɪn","most important","басты, негізгі","главный","Read for the main idea."],
"example":["ɪɡˈzɑːmpl","something that shows what you mean","мысал","пример","Look at the example."],
"answers":["ˈɑːnsəz","the replies to questions","жауаптар","ответы","Check answers."],
"check":["tʃek","to look at something to see if it is correct","тексеру","проверять","Check answers."],

/* --- grammar terms --- */
"helping verb":["ˈhelpɪŋ vɜːb","a verb like do, does, did, is, are or have that we put before the person in a question","көмекші етістік","вспомогательный глагол","The helping verb carries the tense."],
"verb":["vɜːb","a word for an action or a state, like live, work or be","етістік","глагол","The main verb stays in its simple form."],
"tense":["tens","the form of a verb that shows when something happens","шақ","время (глагола)","The helping verb carries the tense."],
"form":["fɔːm","the shape a word takes","тұлға, форма","форма","…in its simple form."],
"person":["ˈpɜːsn","the word for who does the action, like I, you or my sister","жақ, тұлға","лицо (подлежащее)","…helping verb + person + main verb."],
"simple":["ˈsɪmpl","basic; not complicated","қарапайым","простой","the Present Simple"],
"continuous":["kənˈtɪnjuəs","going on right now, without stopping","созылыңқы","длительное","the Present Continuous"],
"perfect":["ˈpɜːfɪkt","a tense that links the past to now","перфект","перфект","the Present Perfect"],
"exception":["ɪkˈsepʃn","a case where the usual rule does not apply","ерекшелік","исключение","One exception is worth learning."],
"mistake":["mɪˈsteɪk","something you do or say that is not correct","қате","ошибка","The three mistakes to watch."],
"routine":["ruːˈtiːn","the things you normally do every day","күнделікті тәртіп","распорядок","the present simple for routines"],
"fact":["fækt","something that is true","факт","факт","routines and facts"],
"arrange":["əˈreɪndʒ","to plan something with another person","келісу, ұйымдастыру","договариваться","right now, or arranged"],
"finish":["ˈfɪnɪʃ","to come to an end","аяқтау","заканчивать","finished time"],
"open":["ˈəʊpən","not closed; still continuing","ашық","открытый","a period that is still open"],
"period":["ˈpɪəriəd","a length of time","кезең","период","a period that is still open"],
"pattern":["ˈpætn","a regular way that something is arranged","үлгі, заңдылық","закономерность, схема","Show the pattern."],

/* --- speaking / writing stage --- */
"interview":["ˈɪntəvjuː","to ask someone questions to find out about them","сұхбат алу","брать интервью","Interview your partner."],
"partner":["ˈpɑːtnə","the person you work with in a pair","жұп, серіктес","партнёр, напарник","Work in pairs with your partner."],
"pair":["peə","two people working together","жұп","пара","Work in pairs."],
"card":["kɑːd","a small piece of card with information on it","карточка","карточка","Take a card."],
"swap":["swɒp","to exchange one thing for another","алмасу","меняться","Then swap cards."],
"extra":["ˈekstrə","more than usual; additional","қосымша","дополнительный","Ask one extra question."],
"agree":["əˈɡriː","to have the same opinion","келісу","соглашаться","Do you agree?"],
"useful":["ˈjuːsfl","helpful; good to have","пайдалы","полезный","Useful language"],
"language":["ˈlæŋɡwɪdʒ","the words people use to communicate","тіл","язык","Useful language"],
"feedback":["ˈfiːdbæk","comments telling you how well you did","кері байланыс","обратная связь","Give feedback after the task."],
"tutor":["ˈtjuːtə","a teacher who works with one student","тәлімгер, оқытушы","тьютор, наставник","She works with a private tutor twice a week."]
};

const TR={
/* G4 - stage intros, useful-language labels and bylines. */
gx001:["Запишите","Жазып алыңыз"],
gx002:["Полезные фразы — сопроводительное письмо","Пайдалы сөз тіркестері — ілеспе хат"],
gx003:["Полезные фразы — как просить и давать совет","Пайдалы сөз тіркестері — кеңес сұрау және беру"],
gx004:["Ваша очередь","Сіздің кезегіңіз"],
gx005:["Задайте себе один вопрос","Өзіңізге бір сұрақ қойыңыз"],
gx006:["Два момента, за которыми стоит следить","Назар аударатын екі нәрсе"],
gx007:["Полезные фразы","Пайдалы сөз тіркестері"],
gx008:["Как его построить","Оны қалай құрастыру керек"],
gx009:["Предлоги движения","Қозғалыс предлогтары"],
gx010:["Что делает объяснение дороги понятным","Бағыт нұсқауын түсінікті ететін нәрсе"],
gx011:["Один и тот же маршрут, два регистра","Бір маршрут, екі стиль"],
gx012:["Ваш план — используйте его на этапе 7","Сіздің жоспарыңыз — оны 7-кезеңде қолданыңыз"],
gx013:["Написание -ed","-ed жазылуы"],
gx014:["Когда это используется","Ол қашан қолданылады"],
gx015:["Написание -ing","-ing жазылуы"],
gx016:["Какое время?","Қай шақ?"],
gx017:["У слушателя тоже есть задача","Тыңдаушының да міндеті бар"],
gx018:["Где их использовать","Оларды қайда қолдану керек"],
gx019:["Форма, которую нужно скопировать","Көшіріп алатын үлгі"],
gx020:["Заполняйте ПЕЧАТНЫМИ БУКВАМИ. Где указано, поставьте галочку.","БАС ӘРІПТЕРМЕН толтырыңыз. Көрсетілген жерге белгі қойыңыз."],
gx021:["Написано специально для этого курса · A2","Осы курс үшін арнайы жазылған · A2"],
gx022:["Кэндзи · Нагано · опубликовано в рубрике «Спроси местного»","Кэндзи · Нагано · «Жергіліктіден сұра» айдарында жарияланған"],
gx023:["Алия К. · опубликовано на сайте о ресторанах · ★★★★☆","Әлия К. · мейрамханалар сайтында жарияланған · ★★★★☆"],
gx024:["Вопросы, которые задают при первом знакомстве.","Танысқанда бірінші қойылатын сұрақтар."],
gx025:["Слова, чтобы рассказать, кто вы и чем занимаетесь.","Өзіңіздің кім екеніңізді және немен айналысатыныңызды айтуға қажет сөздер."],
gx026:["Порядок слов, который работает в любом времени.","Кез келген шақта жұмыс істейтін сөз тәртібі."],
gx027:["Выбирайте, исправляйте, стройте. Короткие блоки, каждый раз новые.","Таңдаңыз, түзетіңіз, құрастырыңыз. Қысқа блоктар, әр жолы жаңа."],
gx028:["Основной текст урока.","Сабақтың негізгі мәтіні."],
gx029:["Он есть почти у каждого. Говорят о нём очень немногие.","Ол бәрінде дерлік бар. Ол туралы өте аз адам айтады."],
gx030:["Семнадцать слов и выражений о том, что люди начинают, бросают и меняют.","Адамдар бастайтын, тоқтататын және өзгертетін нәрселер туралы он жеті сөз бен сөз тіркесі."],
gx031:["Два глагола подряд. Первый решает, как будет выглядеть второй.","Қатарынан екі етістік. Біріншісі екіншісінің формасын шешеді."],
gx032:["Выберите, постройте, измените, а потом исправьте чужое.","Таңдаңыз, құрастырыңыз, өзгертіңіз, содан кейін басқаның қатесін түзетіңіз."],
gx033:["Три человека начали заново, и никто из них этого не планировал.","Үш адам қайта бастады, ешқайсысы оны жоспарламаған."],
gx034:["Все говорят, что смогли бы. Почти никто не пробовал.","Бәрі істей аламын дейді. Ешкім дерлік көрген жоқ."],
gx035:["Шестнадцать слов о том, что происходит на экране — и что происходит, когда вы его выключаете.","Экранда не болатыны — және оны жапқанда не болатыны туралы он алты сөз."],
gx036:["И то и другое — будущее. Одно у вас в голове, другое уже в ежедневнике.","Екеуі де болашақ. Біреуі — ойыңызда, екіншісі — күнделікте."],
gx037:["Намерение или договорённость, затем постройте и исправьте.","Ниет пе, келісім бе — содан кейін құрастырыңыз және түзетіңіз."],
gx038:["Один день без сети, записанный трижды: утром, днём и в десять вечера.","Желісіз бір күн, үш рет жазылған: таңертең, күндіз және кешкі онда."],
gx039:["Фраза, которая ничего не значит, пока кто-то не назовёт день.","Біреу күнді атамайынша ештеңе білдірмейтін сөйлем."],
gx040:["Шестнадцать слов о том, как на самом деле договариваются о встрече.","Кездесуді шын мәнінде қалай ұйымдастыратыны туралы он алты сөз."],
gx041:["Три задачи и по фразе на каждую. Средняя — самая сложная.","Үш тапсырма және әрқайсысына бір сөз тіркесі. Ортаңғысы — ең қиыны."],
gx042:["Пригласите, откажитесь, предложите снова, затем согласитесь.","Шақырыңыз, бас тартыңыз, қайта ұсыныңыз, содан кейін келісіңіз."],
gx043:["Два сообщения, на которые никто не ответил, и два звонка, которые всё решили.","Ешкім жауап бермеген екі хабарлама және бәрін шешкен екі қоңырау."],
gx044:["Два коротких письма. Копировать стоит второе.","Екі қысқа хат. Көшіруге тұрарлығы — екіншісі."],
gx045:["Незнакомый человек заглянет в коробку и решит, кто вы. Положить можно пять вещей.","Бейтаныс адам қорапқа қарап, сіздің кім екеніңізді шешеді. Бес зат сала аласыз."],
gx046:["Три материала и пятнадцать способов описать предмет.","Үш материал және затты сипаттаудың он бес тәсілі."],
gx047:["В вашем языке нет артиклей. В английском артикль есть почти в каждой именной группе, поэтому это привычка, а не правило для заучивания.","Сіздің тіліңізде артикль жоқ. Ағылшын тілінде ол әрбір есім тіркесінде дерлік болады, сондықтан бұл — жаттайтын ереже емес, қалыптастыратын дағды."],
gx048:["Пять заданий на артикли, затем повторение.","Артикльге бес тапсырма, содан кейін қайталау."],
gx049:["Пять предметов, которые выбрал человек, и причина, почему ни один из них не был дорогим.","Бір адам таңдаған бес зат және олардың бірде-бірі қымбат болмауының себебі."],
gx050:["Каждый описывает вещь, которую никогда бы не отдал.","Әрқайсысы ешқашан бермейтін затын сипаттайды."],
gx051:["Опишите так, чтобы человек нашёл эту вещь среди сотни других.","Жүз заттың ішінен танып алатындай етіп сипаттаңыз."],
gx052:["Отметьте каждую строку, в которой вы уверены.","Өзіңіз сенімді әр жолды белгілеңіз."],
gx053:["Точных цифр не знает никто. Всё равно предположите — а потом сравните ответы.","Нақты сандарды ешкім білмейді. Бәрібір болжаңыз — содан кейін жауаптарды салыстырыңыз."],
gx054:["Восемнадцать слов, нужных в любом разговоре о деньгах.","Ақша туралы кез келген әңгімеге қажет он сегіз сөз."],
gx055:["Любой выбор здесь начинается с одного вопроса: существительное считается или нет?","Мұндағы кез келген таңдау бір сұрақтан басталады: зат есім саналады ма?"],
gx056:["Распределите, выберите, дополните, исправьте, затем повторение.","Топтаңыз, таңдаңыз, толықтырыңыз, түзетіңіз, содан кейін қайталау."],
gx057:["Слова количества — о вашей собственной жизни.","Сан-мөлшер сөздері — өз өміріңіз туралы."],
gx058:["Человек забыл английское слово и описывает его. Догадаетесь, о чём речь?","Адам ағылшын сөзін ұмытып, оны сипаттап тұр. Не туралы екенін таба аласыз ба?"],
gx059:["Важнее не слова, а фразы. Учите каждую целиком.","Сөздерден гөрі сөз тіркестері маңызды. Әрқайсысын тұтас күйінде жаттаңыз."],
gx060:["Все слова вы не выучите никогда. Научиться можно другому — доходить до слова, не зная его.","Барлық сөзді ешқашан жаттап алмайсыз. Үйренуге болатыны — сөзді білмей-ақ оны жеткізу."],
gx061:["Выберите, дополните, исправьте, затем опишите.","Таңдаңыз, толықтырыңыз, түзетіңіз, содан кейін сипаттаңыз."],
gx062:["Три покупателя, которые не могут вспомнить слово, и письмо, по которому вернули деньги.","Сөзді есіне түсіре алмаған үш сатып алушы және ақшаны қайтарған хат."],
gx063:["Сначала магазин, потом письмо.","Алдымен дүкен, содан кейін хат."],
gx064:["Шесть ситуаций. Лучшего ответа нет — есть два разных способа быть человеком.","Алты жағдай. Дұрыс жауап жоқ — адам болудың екі түрлі тәсілі бар."],
gx065:["Восемнадцать слов о характере. Они нужны на весь юнит, а не только на этот урок.","Мінез туралы он сегіз сөз. Олар тек осы сабаққа емес, бүкіл бөлімге қажет."],
gx066:["Значение простое. Баллы теряются на форме.","Мағынасы оңай. Ұпай форманы жазғанда жоғалады."],
gx067:["Выберите, перепишите, исправьте и дополните. Пять разных заданий, одна тема.","Таңдаңыз, қайта жазыңыз, түзетіңіз және толықтырыңыз. Бес түрлі тапсырма, бір грамматика."],
gx068:["Используйте язык, говоря о людях, которых вы действительно знаете.","Тілді өзіңіз шынымен білетін адамдар туралы айтқанда қолданыңыз."],
gx069:["Шесть событий, которые случаются в большинстве жизней. Но не со всеми.","Көп өмірде болатын алты оқиға. Бірақ бәрінің басында емес."],
gx070:["Начните с викторины. Сначала ответ, потом проверка.","Викторинадан бастаңыз. Алдымен жауап, содан кейін тексеру."],
gx071:["Оба времени говорят о прошлом. Но только одно называет когда.","Екі шақ та өткен туралы. Бірақ біреуі ғана қашан екенін айтады."],
gx072:["Четыре задания: выбрать, дополнить, различить, исправить.","Төрт тапсырма: таңдау, толықтыру, ажырату, түзету."],
gx073:["Двое друзей говорят о радиопередаче. Запись в четырёх частях.","Екі дос радиобағдарлама туралы әңгімелеседі. Жазба төрт бөліктен тұрады."],
gx074:["Спросите о жизни. Потом спросите когда — и следите, как меняется время.","Өмірі туралы сұраңыз. Содан кейін қашан екенін сұраңыз — шақтың өзгеруін бақылаңыз."],
gx075:["Шесть сообщений. Некоторые легко отнести к месту.","Алты хабарлама. Кейбірін орналастыру оңай."],
gx076:["Три приставки: un-, im-, dis-. Угадать нельзя — их учат вместе со словом.","Үш префикс: un-, im-, dis-. Болжауға келмейді — оларды сөзбен бірге жаттайды."],
gx077:["Время то же, что и в прошлом уроке. Три коротких слова, три задачи и две позиции.","Шақ өткен сабақтағыдай. Үш қысқа сөз, үш түрлі қызмет және екі түрлі орын."],
gx078:["Выберите, поставьте на место, перепишите, исправьте.","Таңдаңыз, орнына қойыңыз, қайта жазыңыз, түзетіңіз."],
gx079:["Пять реальных разговоров, затем образец, который вы скопируете дальше.","Бес нақты әңгіме, содан кейін келесі кезеңде көшіретін үлгі."],
gx080:["Сначала напишите, потом скажите.","Алдымен жазыңыз, содан кейін айтыңыз."],
gx081:["Утром ехали все. Понравилось не всем и не всё.","Таңертең бәрі жолда болды. Бәріне бәрі ұнаған жоқ."],
gx082:["Семнадцать слов, без которых о транспорте ничего толком не скажешь.","Көлік туралы бірдеңе айту үшін қажет он жеті сөз."],
gx083:["Два слова, одна разница: насколько вы уверены.","Екі сөз, бір айырмашылық: қаншалықты сенімдісіз."],
gx084:["Что уже изменилось и что специалисты готовы пообещать.","Не өзгерді және мамандар нені уәде етуге дайын."],
gx085:["Три человека, три города, три разных способа добираться на работу.","Үш адам, үш қала, жұмысқа барудың үш түрлі жолы."],
gx086:["Шесть обычных дел. Что-то делают все. Всё — никто.","Алты күнделікті іс. Бірдеңесін бәрі істейді. Бәрін — ешкім."],
gx087:["Слова, чтобы описать, как на самом деле выглядит ваша неделя.","Аптаңыздың шын мәнінде қалай өтетінін сипаттауға қажет сөздер."],
gx088:["Значение простое. Ошибаются в позиции.","Мағынасы оңай. Қате орнында жіберіледі."],
gx089:["Сначала позиция, потом значение, потом ваши собственные предложения.","Алдымен орны, содан кейін мағынасы, содан кейін өз сөйлемдеріңіз."],
gx090:["Три человека, одни и те же двадцать четыре часа.","Үш адам, дәл сол жиырма төрт сағат."],
gx091:["Радиопередача о писателе, который бегает. Она идёт две с половиной минуты, поэтому слушаем в двух частях.","Жүгіретін жазушы туралы радиобағдарлама. Ол екі жарым минут, сондықтан екі бөлікпен тыңдаймыз."],
gx092:["Спор всегда начинается с того, где ночевать.","Дау әрқашан қайда қонамыз дегеннен басталады."],
gx093:["Слова, которые появляются, как только вы начинаете планировать поездку.","Сапарды жоспарлай бастағанда бірден керек болатын сөздер."],
gx094:["Четыре начала, три окончания и одно правило, которое выбирает между ними.","Төрт бастама, үш аяқталу және олардың арасын шешетін бір ереже."],
gx095:["Выберите начало, потом окончание, затем скажите это иначе.","Бастамасын таңдаңыз, содан кейін аяқталуын, содан кейін басқаша айтыңыз."],
gx096:["Одиннадцать вечера в Токио, и самая дешёвая кровать в городе — за этой дверью.","Токиода кешкі он бір, қаладағы ең арзан төсек — осы есіктің артында."],
gx097:["Пять минут у стойки, от которых зависит впечатление от всей поездки.","Тіркеу үстеліндегі бес минут бүкіл сапардың әсерін шешеді."],
gx098:["Шестнадцать слов. Каждое из них понадобится в ролевой игре.","Он алты сөз. Әрқайсысы рөлдік ойында қажет болады."],
gx099:["Одна и та же просьба, до ссоры — два слова.","Дәл сол өтініш, дауға дейін — екі-ақ сөз."],
gx100:["Составьте просьбу, выберите ответ, затем исправьте грубый вариант.","Өтінішті құрастырыңыз, жауабын таңдаңыз, содан кейін дөрекі нұсқасын түзетіңіз."],
gx101:["Двое гостей, одна стойка. Первое заселение проходит хорошо. Второе — нет.","Екі қонақ, бір тіркеу үстелі. Бірінші тіркелу жақсы өтеді. Екіншісі — жоқ."],
gx102:["У стойки никого нет, в номере холодно, а вы уходите. Вот что вы пишете.","Тіркеу үстелінде ешкім жоқ, бөлме суық, ал сіз шығып бара жатырсыз. Міне, не жазасыз."],
gx103:["Восемь вещей, которым человек может научиться. Кое-что вы уже умеете.","Адам үйрене алатын сегіз нәрсе. Кейбірін сіз істей де аласыз."],
gx104:["Шестнадцать слов о навыках, мышлении и мозге.","Дағдылар, ойлау және ми туралы он алты сөз."],
gx105:["Одна идея, три формы — и только одна из них меняется по времени.","Бір идея, үш форма — олардың біреуі ғана шаққа қарай өзгереді."],
gx106:["Выберите, измените, исправьте, затем используйте.","Таңдаңыз, өзгертіңіз, түзетіңіз, содан кейін қолданыңыз."],
gx107:["Что мозг делает на самом деле и что ему только приписывают.","Ми шын мәнінде не істейді және оған не тек телінеді."],
gx108:["Шесть правил. В любой школе есть какие-то из них. Какие стоит оставить?","Алты ереже. Кез келген мектепте олардың кейбірі бар. Қайсысын қалдырған дұрыс?"],
gx109:["Шестнадцать слов о школе, экзаменах и о том, что получаешь в конце.","Мектеп, емтихан және соңында алатын нәрсе туралы он алты сөз."],
gx110:["Четыре формы. Две из них похожи и значат противоположное.","Төрт форма. Екеуі ұқсас, бірақ мағынасы қарама-қарсы."],
gx111:["Нужно, не нужно, нельзя, можно. Четыре значения, у каждого своя форма.","Керек, керек емес, болмайды, болады. Төрт мағына, әрқайсысының өз формасы."],
gx112:["Одна страна убрала почти все правила. И оставила одно.","Бір ел ережелердің барлығын дерлік алып тастады. Сосын біреуін қалдырды."],
gx113:["Пять моментов, когда вы не поняли. Соотнесите каждый с тем, что пошло не так.","Түсінбей қалған бес сәт. Әрқайсысын не дұрыс болмағанымен сәйкестендіріңіз."],
gx114:["Шестнадцать слов. Большинство из них вы встретите только на бумаге.","Он алты сөз. Олардың көбін тек қағаз бетінен кездестіресіз."],
gx115:["Три разные проблемы. Три разные вещи, которые нужно сказать.","Үш түрлі мәселе. Айтылатын үш түрлі нәрсе."],
gx116:["Подберите нужную фразу к нужной проблеме, потом составьте свою.","Әр мәселеге қажет тіркесті таңдаңыз, содан кейін өзіңіз құрастырыңыз."],
gx117:["Одна и та же проблема, три места, три разные фразы.","Бір мәселе, үш орын, үш түрлі сөз тіркесі."],
gx118:["Прочитайте бланк так, как читает его тот, кто сейчас будет его заполнять.","Бланкіні оны толтыруға отырған адамның көзімен оқыңыз."],
gx119:["Что делают ваши руки в первые три секунды знакомства.","Танысудың алғашқы үш секундында қолыңыз не істейді."],
gx120:["Шестнадцать слов о том, как люди знакомятся, и восемь — о том, чем именно.","Адамдардың қалай танысатыны туралы он алты сөз және немен танысатыны туралы сегіз сөз."],
gx121:["Предложение, нужное всему, что реально и всё ещё возможно.","Нақты әрі әлі де мүмкін нәрсенің бәріне қажет сөйлем."],
gx122:["Пять коротких заданий. Последнее — грамматика юнита 8, она вам ещё нужна.","Бес қысқа тапсырма. Соңғысы — 8-бөлімнің грамматикасы, ол әлі керек."],
gx123:["Откуда взялось рукопожатие и что с ним происходит сейчас.","Қол алысу қайдан шыққан және онымен қазір не болып жатыр."],
gx124:["Ваш офис, ваши правила, ваши условия.","Сіздің кеңсеңіз, сіздің ережелеріңіз, сіздің шарттарыңыз."],
gx125:["Проверьте каждую строку. Если что-то ещё не так — вернитесь к этому этапу.","Әр жолды тексеріңіз. Егер бірдеңе әлі дұрыс болмаса — сол кезеңге оралыңыз."],
gx126:["Неделя без телефона, без спортзала и без крыши. Поехали бы?","Телефонсыз, спортзалсыз және шатырсыз бір апта. Барар ма едіңіз?"],
gx127:["Шестнадцать слов о теле и семь глаголов, которые не работают без своего предлога.","Дене туралы он алты сөз және предлогсыз жұмыс істемейтін жеті етістік."],
gx128:["Одно правило, пять слов: when, as soon as, before, after, until.","Бір ереже, бес сөз: when, as soon as, before, after, until."],
gx129:["Пять коротких заданий. Последнее — грамматика урока 25, не давайте ей забыться.","Бес қысқа тапсырма. Соңғысы — 25-сабақтың грамматикасы, оны ұмыттырмаңыз."],
gx130:["Телефонный разговор о курсе тренировок на природе. Он длится две минуты, поэтому слушаем в двух частях.","Ашық ауадағы жаттығу курсы туралы телефон әңгімесі. Ол екі минут, сондықтан екі бөлікпен тыңдаймыз."],
gx131:["Спланируйте свою неделю вне сети — и скажите, когда что произойдёт.","Желіден тыс өз аптаңызды жоспарлаңыз — және не қашан болатынын айтыңыз."],
gx132:["Когда вам в последний раз сказали, что делать, — вы это сделали?","Соңғы рет сізге не істеу керегін айтқанда — сіз оны істедіңіз бе?"],
gx133:["Шестнадцать слов. Последние шесть понадобятся в вашем письме.","Он алты сөз. Соңғы алтауы хатыңызда қажет болады."],
gx134:["Значат они примерно одно и то же. Звучат — по-разному.","Мағынасы шамамен бірдей. Ал естілуі — әртүрлі."],
gx135:["Пять заданий. Последнее не даёт забыть уроки 25 и 26.","Бес тапсырма. Соңғысы 25 және 26-сабақтарды ұмыттырмайды."],
gx136:["Читайте так, как читает автор: не ради новости, а ради структуры и фраз.","Жазушының көзімен оқыңыз: жаңалық үшін емес, құрылымы мен сөз тіркестері үшін."],
gx137:["Три реальные консультации, затем восемь фраз отдельно.","Үш нақты кеңес, содан кейін сегіз сөз тіркесі бөлек."],
gx138:["Сначала совет вслух, потом письмо на бумаге.","Алдымен ауызша кеңес, содан кейін қағаздағы хат."],
gx139:["Никто не ест всё. Интересен вопрос почему.","Ешкім бәрін жемейді. Қызығы — неге деген сұрақ."],
gx140:["Шестнадцать слов. Четыре описывают вкус, два — ощущение, остальные — то, что кладут.","Он алты сөз. Төртеуі дәмді, екеуі сезімді сипаттайды, қалғаны — қосылатын нәрселер."],
gx141:["Английский превращает глагол в существительное с помощью -ing. Вопрос только в том, что стоит перед ним.","Ағылшын тілі етістікті -ing арқылы зат есімге айналдырады. Мәселе тек оның алдында не тұратынында."],
gx142:["Пять коротких заданий. Каждое подходит к форме с другой стороны.","Бес қысқа тапсырма. Әрқайсысы форманы басқа қырынан алады."],
gx143:["Почему двое могут есть одно и то же и совершенно не сойтись во мнении.","Неге екі адам бір нәрсені жеп, мүлдем келіспей қалады."],
gx144:["Одно короткое задание по записи, затем момент произношения.","Жазба бойынша бір қысқа тапсырма, содан кейін айтылым сәті."],
gx145:["Слова из этапа 2, грамматика из этапа 3 — в одной минуте речи.","2-кезеңнің сөздері, 3-кезеңнің грамматикасы — бір минуттық сөйлеуде."],
gx146:["Отметьте всё, что вы уже умеете.","Өзіңіз істей алатынның бәрін белгілеңіз."],
gx147:["Почти ничто не доходит до вас в том виде, в каком покинуло поле.","Ешнәрсе дерлік сізге алқаптан шыққан күйінде жетпейді."],
gx148:["Восемь видов упаковки, шесть способов обработки и две даты, которые путают.","Сегіз түрлі ыдыс, алты өңдеу тәсілі және шатастырылатын екі күн."],
gx149:["Когда неважно, кто это сделал, — или никто не знает.","Кім істегені маңызды болмағанда — немесе ешкім білмегенде."],
gx150:["Пять заданий. В двух из них пассив нужно построить с нуля.","Бес тапсырма. Екеуінде ырықсыз етісті нөлден құрастырасыз."],
gx151:["Две минуты о том, как хранили еду — от шкур до консервного ножа.","Тамақты қалай сақтағаны туралы екі минут — терілерден консерві ашқышқа дейін."],
gx152:["Четыре-пять шагов, все в пассиве, и никто не говорит, кто это делает.","Төрт-бес қадам, бәрі ырықсыз етісте, ешкім кім істейтінін айтпайды."],
gx153:["У каждого есть тот, которого ждут, и тот, который просто терпят.","Әркімде күтетіні де, әрең шыдайтыны да бар."],
gx154:["Слова, нужные гостю ещё до того, как он что-то забронирует.","Қонаққа бірдеңе брондамай тұрып қажет болатын сөздер."],
gx155:["Одно правило покрывает почти всё. Проблема — в маленьких словах перед ним.","Бір ереже бәрін дерлік қамтиды. Қиындық — оның алдындағы кішкентай сөздерде."],
gx156:["Сначала форма, потом маленькие слова, потом ваше собственное мнение.","Алдымен форма, содан кейін кішкентай сөздер, содан кейін өз пікіріңіз."],
gx157:["Читайте это как автор, а не только как читатель. В конце урока вы напишете своё.","Мұны тек оқырман емес, жазушы ретінде оқыңыз. Сабақ соңында өзіңіз жазасыз."],
gx158:["Три человека, три страны, три любимых времени года — и никто не согласен.","Үш адам, үш ел, үш сүйікті маусым — және ешқайсысы келіспейді."],
gx159:["Та же структура, что у поста Кэндзи. Ваша страна, ваше мнение.","Кэндзидің жазбасындағыдай құрылым. Сіздің еліңіз, сіздің пікіріңіз."],
gx160:["Пять вещей, которые идут не так в ресторанах. Жалуются все на разное.","Мейрамханада дұрыс болмайтын бес нәрсе. Әркім әртүрлісіне шағымданады."],
gx161:["Половина этих слов нужна за столом. Вторая — на следующий день, когда вы пишете отзыв.","Бұл сөздердің жартысы дастарханда керек. Қалғаны — ертеңіне, пікір жазғанда."],
gx162:["Жалоба — простая часть. Работу в английском делают слова вокруг неё.","Шағымның өзі оңай. Ағылшын тілінде негізгі жұмысты айналасындағы сөздер істейді."],
gx163:["Четыре задания. Последнее возвращает пассив.","Төрт тапсырма. Соңғысы ырықсыз етісті қайта әкеледі."],
gx164:["Именно этот разговор вы проведёте сами в конце урока.","Дәл осы әңгімені сабақ соңында өзіңіз жүргізесіз."],
gx165:["Ужин был вчера вечером. Это она написала о нём утром. Читайте как автор.","Кешкі ас кеше болды. Мынаны ол таңертең жазды. Жазушы ретінде оқыңыз."],
gx166:["Сначала скажите. Потом напишите — как «на следующее утро».","Алдымен айтыңыз. Содан кейін «ертеңіне таңертеңгідей» етіп жазыңыз."],
gx167:["Три утверждения. Со всеми вы не согласитесь.","Үш пікір. Бәрімен келісе алмайсыз."],
gx168:["Слова, к которым тянутся, когда говорят о мире.","Әлем туралы сөйлескенде қолданылатын сөздер."],
gx169:["Говорим о том, чего нет, и о том, что из этого следовало бы.","Шындыққа сай емес нәрсе туралы және содан не шығатыны туралы айтамыз."],
gx170:["Выберите, постройте, исправьте, затем превратите реальные предложения в воображаемые.","Таңдаңыз, құрастырыңыз, түзетіңіз, содан кейін нақты сөйлемдерді қиялиға айналдырыңыз."],
gx171:["Год, когда ООН спросила у мира, что чинить первым.","БҰҰ әлемнен алдымен нені түзету керегін сұраған жыл."],
gx172:["Радиопередача. Три человека, три страны, по шестьдесят секунд каждому.","Радиобағдарлама. Үш адам, үш ел, әрқайсысына алпыс секунд."],
gx173:["Та же передача, те же правила. Одна идея, одна минута, потом оценка.","Сол бағдарлама, сол ережелер. Бір идея, бір минут, содан кейін бағаланады."],
gx174:["Семь вещей. Некоторые почти исчезли.","Жеті нәрсе. Кейбірі жоғалып кетуге жақын."],
gx175:["О чём сообщают и какими фразовыми глаголами.","Не туралы хабарлайды және оны қандай фразалық етістіктермен жеткізеді."],
gx176:["То, что когда-то было правдой, а сейчас — нет.","Бір кездері рас болған, ал қазір — жоқ."],
gx177:["Постройте все три формы, потом решите, когда лучше past simple.","Үш форманы да құрастырыңыз, содан кейін past simple қашан жақсырақ екенін шешіңіз."],
gx178:["Сколько времени раньше шли новости и что изменилось.","Бұрын жаңалық қанша уақытта жететін еді және не өзгерді."],
gx179:["Короткий выпуск новостей. Сорок секунд, две истории.","Қысқа жаңалықтар шығарылымы. Қырық секунд, екі оқиға."],
gx180:["Расспросите человека о жизни, которая изменилась.","Өзгерген өмір туралы бір адамнан сұраңыз."],
gx181:["Шесть утверждений. По-настоящему важно вам только одно.","Алты пікір. Сізге шын мәнінде тек біреуі маңызды."],
gx182:["Шесть слов для спора и восемь — чтобы описать то, что стоит описать.","Дауласуға арналған алты сөз және сипаттауға тұрарлық нәрсені сипаттайтын сегіз сөз."],
gx183:["В английском почти никогда не возражают сразу. Сначала что-то уступают.","Ағылшын тілінде бірден қарсы шықпайды. Алдымен бірдеңеге келіседі."],
gx184:["Постройте ответы, потом решите, насколько резко хотите прозвучать.","Жауаптарды құрастырыңыз, содан кейін қаншалықты қатты естілгіңіз келетінін шешіңіз."],
gx185:["Журналист останавливает людей на улице и задаёт всем один и тот же вопрос.","Тілші көшеде адамдарды тоқтатып, бәріне бір сұрақ қояды."],
gx186:["Читайте как выступающий, а не как читатель. Вы скопируете эту структуру.","Оқырман емес, сөз сөйлеуші ретінде оқыңыз. Осы құрылымды көшіресіз."],
gx187:["Две минуты на ногах, потом вопросы.","Тік тұрып екі минут, содан кейін сұрақтар."],
gx188:["Одни профессии держат людей по тридцать лет. Другие теряют их за восемнадцать месяцев.","Кейбір мамандық адамды отыз жыл ұстайды. Кейбірі оны он сегіз айда жоғалтады."],
gx189:["Слова, чтобы сказать, чем вы занимаетесь и где.","Немен және қайда айналысатыныңызды айтуға қажет сөздер."],
gx190:["Говорим, как долго что-то верно и когда это началось.","Бірдеңенің қанша уақыттан бері солай екенін және қашан басталғанын айтамыз."],
gx191:["Выберите, постройте, исправьте, затем определитесь между временами.","Таңдаңыз, құрастырыңыз, түзетіңіз, содан кейін шақтардың арасын шешіңіз."],
gx192:["Сколько люди на самом деле держатся за нынешнюю работу.","Адамдар қазіргі жұмысында шын мәнінде қанша уақыт істейді."],
gx193:["Радиопередача об офисе открытого типа. Четыре минуты, в пяти частях.","Ашық кеңсе туралы радиобағдарлама. Төрт минут, бес бөлікте."],
gx194:["Спросите реального человека, как долго, и ответьте за себя.","Нақты адамнан қанша уақыт екенін сұраңыз және өзіңіз үшін жауап беріңіз."],
gx195:["У двоих может быть одна должность и совершенно разные дни.","Екі адамның лауазымы бір, ал күндері мүлдем бөлек болуы мүмкін."],
gx196:["Обязанности, люди, которых вы нанимаете, и пять устойчивых выражений с in.","Міндеттер, жұмысқа алатын адамдар және in қатысатын бес тұрақты тіркес."],
gx197:["Одна форма и четыре места, куда она встаёт.","Бір форма және оның төрт орны."],
gx198:["Постройте, исправьте, затем выберите между двумя формами.","Құрастырыңыз, түзетіңіз, содан кейін екі форманың бірін таңдаңыз."],
gx199:["Что изменилось, когда офис перестал быть местом.","Кеңсе орын болудан қалғанда не өзгерді."],
gx200:["Три человека рассказывают, из чего состоит их работа. Две минуты.","Үш адам жұмысының неден тұратынын айтады. Екі минут."],
gx201:["Опишите работу так, как это сделали три говорящих.","Жұмысты үш сөйлеуші сияқты сипаттаңыз."],
gx202:["Настоящие вопросы, которые задают на настоящих собеседованиях настоящие компании.","Нақты компаниялар нақты сұхбатта қоятын нақты сұрақтар."],
gx203:["Что у вас есть, что вы умеете и в чём признаётесь.","Сізде не бар, нені жақсы істейсіз және нені мойындайсыз."],
gx204:["Почти на любом собеседовании по-английски спросят это. Форма ответа важнее слов.","Ағылшын тіліндегі кез келген сұхбатта дерлік осыны сұрайды. Жауаптың құрылымы сөзден маңызды."],
gx205:["Постройте ответы до того, как придётся их произносить.","Жауаптарды айтуға тура келгенге дейін дайындап қойыңыз."],
gx206:["Настоящее собеседование от начала до конца. Именно его вы проведёте сами.","Басынан аяғына дейін нақты сұхбат. Дәл соны өзіңіз жүргізесіз."],
gx207:["Читайте как автор, а не как читатель. Вы скопируете эту структуру.","Оқырман емес, жазушы ретінде оқыңыз. Осы құрылымды көшіресіз."],
gx208:["Сначала резюме, потом собеседование.","Алдымен түйіндеме, содан кейін сұхбат."],
gx209:["Восемь вещей, которые можно увидеть на улице. Какие есть всегда?","Көшеден көруге болатын сегіз нәрсе. Қайсысы әрқашан бар?"],
gx210:["Люди, места и слова о том, какая улица на ощущение.","Адамдар, орындар және көшенің әсерін білдіретін сөздер."],
gx211:["Что верно всегда и что происходит прямо сейчас.","Не әрқашан рас және дәл қазір не болып жатыр."],
gx212:["Семь заданий. Слова времени подсказывают, какое время нужно.","Жеті тапсырма. Мезгіл сөздері қай шақ керегін айтады."],
gx213:["Художник, продавец чая и дворник.","Суретші, шай сатушы және көше тазалаушы."],
gx214:["Две картины одного и того же места.","Бір орынның екі суреті."],
gx215:["Три подсказки, один предмет. Слушайте и угадайте.","Үш белгі, бір зат. Тыңдап, болжаңыз."],
gx216:["Семнадцать повседневных предметов.","Он жеті күнделікті зат."],
gx217:["Что сказать, когда не можете вспомнить слово.","Сөзді есіңізге түсіре алмағанда не айтасыз."],
gx218:["Шесть заданий. Последнее — игра, в которую вы сыграете на этапе 7.","Алты тапсырма. Соңғысы — 7-кезеңде ойнайтын ойын."],
gx219:["Дом, в котором автор не может назвать ни одну вещь.","Автор бірде-бір затты атай алмайтын үй."],
gx220:["Три человека живут в чужом доме.","Үш адам басқаның үйінде тұрып жатыр."],
gx221:["Навык, который понадобится каждый раз, когда слово не приходит.","Сөз есіңізге түспеген сайын қажет болатын дағды."],
gx222:["Проследите маршрут в голове. Говорить пока не нужно.","Маршрутты ойша қадағалаңыз. Әзірге айтудың қажеті жоқ."],
gx223:["Большинство сегодняшних слов — не предметы, а направления. Следите за стрелками.","Бүгінгі сөздердің көбі — зат емес, бағыт. Көрсеткілерге қараңыз."],
gx224:["Нового времени сегодня нет. Указания — это повелительное наклонение, и форма разговора здесь важна не меньше слов.","Бүгін жаңа шақ жоқ. Нұсқау — бұйрық рай, ал әңгіменің құрылымы сөзден кем маңызды емес."],
gx225:["Шесть заданий, последнее — маршрут, который вы напишете сами.","Алты тапсырма, соңғысы — өзіңіз жазатын маршрут."],
gx226:["Бангкок, загородный дом и автовокзал. Каждый раз одни и те же четыре шага.","Бангкок, қала сыртындағы үй және автовокзал. Әр жолы дәл сол төрт қадам."],
gx227:["Одно отправлено другу, который уже идёт. Другое написано для любого, кто придёт.","Біреуі жолға шыққан досқа жіберілген. Екіншісі — келетін кез келген адамға жазылған."],
gx228:["Обе роли. Уточнения — это половина задания.","Екі рөл де. Қайта сұрап нақтылау — тапсырманың жартысы."],
gx229:["Шесть вещей, которые люди делают телом. Что из этого делали вы?","Адамдар денесімен істейтін алты нәрсе. Оның қайсысын сіз істедіңіз?"],
gx230:["Глаголы, нужные такой истории, и маленькие слова, которые задают направление.","Мұндай әңгімеге қажет етістіктер және бағытты көрсететін кішкентай сөздер."],
gx231:["Большую часть вы уже знаете. Ломается всё на отрицании и вопросе.","Көбін сіз білесіз. Бәрі болымсыз түр мен сұраққа келгенде бұзылады."],
gx232:["Восемь коротких заданий: от выбора формы до её использования в разговоре.","Сегіз қысқа тапсырма: форманы таңдаудан оны әңгімеде қолдануға дейін."],
gx233:["Два текста. История с места событий и то, что было два года спустя.","Екі мәтін. Оқиға орнындағы әңгіме және екі жылдан кейін не болғаны."],
gx234:["Та же история по радио. Задание одно — слушайте цифры.","Дәл сол әңгіме радиода. Тапсырма біреу — сандарды тыңдаңыз."],
gx235:["Короткая правдивая история из вашей жизни, рассказанная по шагам.","Өз өміріңізден қысқа шынайы оқиға, қадаммен айтылған."],
gx236:["Шесть небольших ситуаций. Соотнесите каждую с чувством, которое она вызывает.","Алты шағын сәт. Әрқайсысын ол тудыратын сезіммен сәйкестендіріңіз."],
gx237:["Шестнадцать слов о том, что вы чувствовали, плюс наречия о том, как вы это делали.","Не сезгеніңіз туралы он алты сөз және оны қалай істегеніңізді айтатын үстеулер."],
gx238:["Одно действие уже шло. Другое в него вмешалось.","Бір әрекет жүріп жатқан. Екіншісі оны бөліп жіберді."],
gx239:["Восемь заданий: от голой формы до разговора, который мог бы состояться.","Сегіз тапсырма: жалаң формадан шынымен болуы мүмкін әңгімеге дейін."],
gx240:["Психолог о самых странных тридцати секундах вашего дня.","Психолог күніңіздің ең таңғажайып отыз секунды туралы."],
gx241:["Момент, когда что-то вмешалось в обычный день.","Кәдімгі күнге бірдеңе килігіп кеткен сәт."],
gx242:["Пять вещей, которые могут пойти не так в одной поездке. Что случится первым?","Бір сапарда дұрыс болмауы мүмкін бес нәрсе. Алдымен қайсысы болады?"],
gx243:["Сегодня список короткий. Язык, на котором держится урок, — на этапе 3.","Бүгін тізім қысқа. Сабақты ұстап тұрған тіл — 3-кезеңде."],
gx244:["Новых времён нет. Оба у вас уже есть. Сегодня они работают вместе, вместе с окружающими фразами.","Жаңа шақ жоқ. Екеуі де сізде бар. Бүгін олар айналасындағы тіркестермен бірге жұмыс істейді."],
gx245:["Шесть заданий. Последнее — репетиция этапа 7.","Алты тапсырма. Соңғысы — 7-кезеңге дайындық."],
gx246:["Двое рассказывают, и один разговор, где слушатель делает половину работы.","Екеуі әңгімелейді, ал бір әңгімеде жұмыстың жартысын тыңдаушы істейді."],
gx247:["Та же структура истории, но записанная.","Дәл сол әңгіме құрылымы, бірақ жазбаша."],
gx248:["Ваша собственная худшая поездка — сначала вслух, потом на бумаге.","Өзіңіздің ең сәтсіз сапарыңыз — алдымен ауызша, содан кейін қағазда."],
gx249:["Тридцать вопросов только по юниту 1. Ответьте на все, затем нажмите «Проверить». Для зачёта нужен 21 балл из 30 — и тест можно проходить сколько угодно раз.","1-бөлім бойынша ғана отыз сұрақ. Барлығына жауап беріп, «Тексеру» түймесін басыңыз. Өту үшін 30-дың 21-і қажет — тестті қалағаныңызша қайта тапсыруға болады."],
gx250:["Тридцать вопросов только по юниту 10. Ответьте на все, затем нажмите «Проверить». Для зачёта нужен 21 балл из 30 — и тест можно проходить сколько угодно раз.","10-бөлім бойынша ғана отыз сұрақ. Барлығына жауап беріп, «Тексеру» түймесін басыңыз. Өту үшін 30-дың 21-і қажет — тестті қалағаныңызша қайта тапсыруға болады."],
gx251:["Тридцать вопросов только по юниту 11. Ответьте на все, затем нажмите «Проверить». Для зачёта нужен 21 балл из 30 — и тест можно проходить сколько угодно раз.","11-бөлім бойынша ғана отыз сұрақ. Барлығына жауап беріп, «Тексеру» түймесін басыңыз. Өту үшін 30-дың 21-і қажет — тестті қалағаныңызша қайта тапсыруға болады."],
gx252:["Тридцать вопросов только по юниту 12. Ответьте на все, затем нажмите «Проверить». Для зачёта нужен 21 балл из 30 — и тест можно проходить сколько угодно раз. Это последний тест уровня.","12-бөлім бойынша ғана отыз сұрақ. Барлығына жауап беріп, «Тексеру» түймесін басыңыз. Өту үшін 30-дың 21-і қажет — тестті қалағаныңызша қайта тапсыруға болады. Бұл — деңгейдің соңғы тесті."],
gx253:["Тридцать вопросов только по юниту 2. Ответьте на все, затем нажмите «Проверить». Для зачёта нужен 21 балл из 30 — и тест можно проходить сколько угодно раз.","2-бөлім бойынша ғана отыз сұрақ. Барлығына жауап беріп, «Тексеру» түймесін басыңыз. Өту үшін 30-дың 21-і қажет — тестті қалағаныңызша қайта тапсыруға болады."],
gx254:["Тридцать вопросов только по юниту 3. Ответьте на все, затем нажмите «Проверить». Для зачёта нужен 21 балл из 30 — и тест можно проходить сколько угодно раз.","3-бөлім бойынша ғана отыз сұрақ. Барлығына жауап беріп, «Тексеру» түймесін басыңыз. Өту үшін 30-дың 21-і қажет — тестті қалағаныңызша қайта тапсыруға болады."],
gx255:["Тридцать вопросов только по юниту 4. Ответьте на все, затем нажмите «Проверить». Для зачёта нужен 21 балл из 30 — и тест можно проходить сколько угодно раз.","4-бөлім бойынша ғана отыз сұрақ. Барлығына жауап беріп, «Тексеру» түймесін басыңыз. Өту үшін 30-дың 21-і қажет — тестті қалағаныңызша қайта тапсыруға болады."],
gx256:["Тридцать вопросов только по юниту 5. Ответьте на все, затем нажмите «Проверить». Для зачёта нужен 21 балл из 30 — и тест можно проходить сколько угодно раз.","5-бөлім бойынша ғана отыз сұрақ. Барлығына жауап беріп, «Тексеру» түймесін басыңыз. Өту үшін 30-дың 21-і қажет — тестті қалағаныңызша қайта тапсыруға болады."],
gx257:["Тридцать вопросов только по юниту 6. Ответьте на все, затем нажмите «Проверить». Для зачёта нужен 21 балл из 30 — и тест можно проходить сколько угодно раз.","6-бөлім бойынша ғана отыз сұрақ. Барлығына жауап беріп, «Тексеру» түймесін басыңыз. Өту үшін 30-дың 21-і қажет — тестті қалағаныңызша қайта тапсыруға болады."],
gx258:["Тридцать вопросов только по юниту 7. Ответьте на все, затем нажмите «Проверить». Для зачёта нужен 21 балл из 30 — и тест можно проходить сколько угодно раз.","7-бөлім бойынша ғана отыз сұрақ. Барлығына жауап беріп, «Тексеру» түймесін басыңыз. Өту үшін 30-дың 21-і қажет — тестті қалағаныңызша қайта тапсыруға болады."],
gx259:["Тридцать вопросов только по юниту 8. Ответьте на все, затем нажмите «Проверить». Для зачёта нужен 21 балл из 30 — и тест можно проходить сколько угодно раз.","8-бөлім бойынша ғана отыз сұрақ. Барлығына жауап беріп, «Тексеру» түймесін басыңыз. Өту үшін 30-дың 21-і қажет — тестті қалағаныңызша қайта тапсыруға болады."],
gx260:["Тридцать вопросов только по юниту 9. Ответьте на все, затем нажмите «Проверить». Для зачёта нужен 21 балл из 30 — и тест можно проходить сколько угодно раз.","9-бөлім бойынша ғана отыз сұрақ. Барлығына жауап беріп, «Тексеру» түймесін басыңыз. Өту үшін 30-дың 21-і қажет — тестті қалағаныңызша қайта тапсыруға болады."],

/* G4 - the twelve assessments now translate like the lessons do. */
u10r101:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
u10r102:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u10r103:["Поставьте глагол в скобках в правильную форму.","Жақша ішіндегі етістікті дұрыс формаға қойыңыз."],
u10r104:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u10r105:["В каждом предложении одно слово лишнее. Нажмите на него.","Әр сөйлемде бір сөз артық. Соны басыңыз."],
u10r106:["Перепишите предложение так, чтобы смысл не изменился.","Мағынасы өзгермейтіндей етіп сөйлемді қайта жазыңыз."],
u10r107:["Часть 2 · Лексика","2-бөлім · Лексика"],
u10r108:["Дополните каждое предложение одним словом.","Әр сөйлемді бір сөзбен толықтырыңыз."],
u10r109:["Выберите правильное слово.","Дұрыс сөзді таңдаңыз."],
u10r110:["В каждой группе одно слово лишнее. Нажмите на него.","Әр топта бір сөз артық. Соны басыңыз."],
u10r111:["Часть 3 · Речевые функции","3-бөлім · Сөйлеу функциялары"],
u10r112:["Выберите правильную фразу.","Дұрыс сөз тіркесін таңдаңыз."],
u10r113:["Дополните одним словом.","Бір сөзбен толықтырыңыз."],
u10r114:["Расположите три части отзыва в обычном порядке.","Пікірдің үш бөлігін әдеттегі ретпен қойыңыз."],
u11r101:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
u11r102:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u11r103:["Поставьте глагол в скобках в правильную форму.","Жақша ішіндегі етістікті дұрыс формаға қойыңыз."],
u11r104:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u11r105:["В каждом предложении одно слово лишнее. Нажмите на него.","Әр сөйлемде бір сөз артық. Соны басыңыз."],
u11r106:["Перепишите предложение так, чтобы смысл не изменился.","Мағынасы өзгермейтіндей етіп сөйлемді қайта жазыңыз."],
u11r107:["Часть 2 · Лексика","2-бөлім · Лексика"],
u11r108:["Дополните каждое предложение одним словом.","Әр сөйлемді бір сөзбен толықтырыңыз."],
u11r109:["Выберите правильный фразовый глагол.","Дұрыс фразалық етістікті таңдаңыз."],
u11r110:["В каждой группе одно слово лишнее. Нажмите на него.","Әр топта бір сөз артық. Соны басыңыз."],
u11r111:["Часть 3 · Речевые функции","3-бөлім · Сөйлеу функциялары"],
u11r112:["Выберите правильную фразу.","Дұрыс сөз тіркесін таңдаңыз."],
u11r113:["Дополните одним словом.","Бір сөзбен толықтырыңыз."],
u11r114:["Расположите три части презентации в обычном порядке.","Презентацияның үш бөлігін әдеттегі ретпен қойыңыз."],
u12r101:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
u12r102:["Выберите правильное слово.","Дұрыс сөзді таңдаңыз."],
u12r103:["Поставьте глагол в скобках в правильную форму.","Жақша ішіндегі етістікті дұрыс формаға қойыңыз."],
u12r104:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u12r105:["В каждом предложении одно слово лишнее. Нажмите на него.","Әр сөйлемде бір сөз артық. Соны басыңыз."],
u12r106:["Перепишите предложение так, чтобы смысл не изменился.","Мағынасы өзгермейтіндей етіп сөйлемді қайта жазыңыз."],
u12r107:["Часть 2 · Лексика","2-бөлім · Лексика"],
u12r108:["Дополните каждое предложение одним словом.","Әр сөйлемді бір сөзбен толықтырыңыз."],
u12r109:["Выберите правильное слово.","Дұрыс сөзді таңдаңыз."],
u12r110:["В каждой группе одно слово лишнее. Нажмите на него.","Әр топта бір сөз артық. Соны басыңыз."],
u12r111:["Часть 3 · Речевые функции","3-бөлім · Сөйлеу функциялары"],
u12r112:["Выберите правильную фразу.","Дұрыс сөз тіркесін таңдаңыз."],
u12r113:["Дополните одним словом.","Бір сөзбен толықтырыңыз."],
u12r114:["Расположите три раздела резюме в обычном порядке.","Түйіндеменің үш бөлімін әдеттегі ретпен қойыңыз."],
u1r101:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
u1r102:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u1r103:["Дополните вопрос одним словом.","Сұрақты бір сөзбен толықтырыңыз."],
u1r104:["Выберите предложение с правильным порядком слов.","Сөз тәртібі дұрыс сөйлемді таңдаңыз."],
u1r105:["В каждом предложении одно слово лишнее. Нажмите на него.","Әр сөйлемде бір сөз артық. Соны басыңыз."],
u1r106:["Перепишите предложение так, чтобы смысл не изменился.","Мағынасы өзгермейтіндей етіп сөйлемді қайта жазыңыз."],
u1r107:["Часть 2 · Лексика","2-бөлім · Лексика"],
u1r108:["Дополните каждое предложение одним словом.","Әр сөйлемді бір сөзбен толықтырыңыз."],
u1r109:["Выберите правильное слово.","Дұрыс сөзді таңдаңыз."],
u1r110:["В каждой группе одно слово лишнее. Нажмите на него.","Әр топта бір сөз артық. Соны басыңыз."],
u1r111:["Часть 3 · Речевые функции","3-бөлім · Сөйлеу функциялары"],
u1r112:["Выберите правильную фразу.","Дұрыс сөз тіркесін таңдаңыз."],
u1r113:["Дополните одним словом.","Бір сөзбен толықтырыңыз."],
u1r114:["Расположите три части рекомендации в обычном порядке.","Ұсыныстың үш бөлігін әдеттегі ретпен қойыңыз."],
u2r101:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
u2r102:["Обычно или прямо сейчас? Выберите правильную форму.","Әдетте ме, әлде дәл қазір ме? Дұрыс форманы таңдаңыз."],
u2r103:["Поставьте глагол в скобках в правильную форму.","Жақша ішіндегі етістікті дұрыс формаға қойыңыз."],
u2r104:["Выберите правильное союзное слово.","Дұрыс байланыстырушы сөзді таңдаңыз."],
u2r105:["В каждом предложении одно слово лишнее. Нажмите на него.","Әр сөйлемде бір сөз артық. Соны басыңыз."],
u2r106:["Объедините два предложения в одно.","Екі сөйлемді біріктіріп жазыңыз."],
u2r107:["Часть 2 · Лексика","2-бөлім · Лексика"],
u2r108:["Дополните каждое предложение одним словом или фразой.","Әр сөйлемді бір сөзбен немесе сөз тіркесімен толықтырыңыз."],
u2r109:["Выберите правильное слово.","Дұрыс сөзді таңдаңыз."],
u2r110:["В каждой группе одно слово лишнее. Нажмите на него.","Әр топта бір сөз артық. Соны басыңыз."],
u2r111:["Часть 3 · Речевые функции","3-бөлім · Сөйлеу функциялары"],
u2r112:["Выберите правильную фразу.","Дұрыс сөз тіркесін таңдаңыз."],
u2r113:["Дополните одним словом.","Бір сөзбен толықтырыңыз."],
u2r114:["Расположите три указания в обычном порядке.","Үш нұсқауды әдеттегі ретпен қойыңыз."],
u3r101:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
u3r102:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u3r103:["Поставьте глагол в скобках в правильную форму.","Жақша ішіндегі етістікті дұрыс формаға қойыңыз."],
u3r104:["Выберите правильное наречие.","Дұрыс үстеуді таңдаңыз."],
u3r105:["В каждом предложении одно слово лишнее. Нажмите на него.","Әр сөйлемде бір сөз артық. Соны басыңыз."],
u3r106:["Перепишите предложение так, чтобы смысл не изменился.","Мағынасы өзгермейтіндей етіп сөйлемді қайта жазыңыз."],
u3r107:["Часть 2 · Лексика","2-бөлім · Лексика"],
u3r108:["Дополните каждое предложение одним словом.","Әр сөйлемді бір сөзбен толықтырыңыз."],
u3r109:["Выберите правильное слово.","Дұрыс сөзді таңдаңыз."],
u3r110:["В каждой группе одно слово лишнее. Нажмите на него.","Әр топта бір сөз артық. Соны басыңыз."],
u3r111:["Часть 3 · Речевые функции","3-бөлім · Сөйлеу функциялары"],
u3r112:["Выберите правильную фразу.","Дұрыс сөз тіркесін таңдаңыз."],
u3r113:["Дополните одним словом.","Бір сөзбен толықтырыңыз."],
u3r114:["Расположите три части неформального письма в обычном порядке.","Бейресми хаттың үш бөлігін әдеттегі ретпен қойыңыз."],
u4r101:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
u4r102:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u4r103:["Поставьте глагол в скобках в правильную форму.","Жақша ішіндегі етістікті дұрыс формаға қойыңыз."],
u4r104:["Намерение или договорённость? Выберите более естественную форму.","Ниет пе, әлде келісілген жоспар ма? Табиғи форманы таңдаңыз."],
u4r105:["В каждом предложении одно слово лишнее. Нажмите на него.","Әр сөйлемде бір сөз артық. Соны басыңыз."],
u4r106:["Перепишите предложение так, чтобы смысл не изменился.","Мағынасы өзгермейтіндей етіп сөйлемді қайта жазыңыз."],
u4r107:["Часть 2 · Лексика","2-бөлім · Лексика"],
u4r108:["Дополните каждое предложение одним словом или фразой.","Әр сөйлемді бір сөзбен немесе сөз тіркесімен толықтырыңыз."],
u4r109:["Выберите правильное слово.","Дұрыс сөзді таңдаңыз."],
u4r110:["В каждой группе одно слово лишнее. Нажмите на него.","Әр топта бір сөз артық. Соны басыңыз."],
u4r111:["Часть 3 · Речевые функции","3-бөлім · Сөйлеу функциялары"],
u4r112:["Выберите правильную фразу.","Дұрыс сөз тіркесін таңдаңыз."],
u4r113:["Дополните диалог.","Диалогты толықтырыңыз."],
u4r114:["Расположите три части вежливого отказа в обычном порядке.","Сыпайы бас тартудың үш бөлігін әдеттегі ретпен қойыңыз."],
u5r101:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
u5r102:["Выберите правильный артикль.","Дұрыс артикльді таңдаңыз."],
u5r103:["Дополните одним словом.","Бір сөзбен толықтырыңыз."],
u5r104:["Выберите правильное слово количества.","Дұрыс сан-мөлшер сөзін таңдаңыз."],
u5r105:["В каждом предложении одно слово лишнее. Нажмите на него.","Әр сөйлемде бір сөз артық. Соны басыңыз."],
u5r106:["Перепишите предложение так, чтобы смысл не изменился.","Мағынасы өзгермейтіндей етіп сөйлемді қайта жазыңыз."],
u5r107:["Часть 2 · Лексика","2-бөлім · Лексика"],
u5r108:["Дополните каждое предложение одним словом.","Әр сөйлемді бір сөзбен толықтырыңыз."],
u5r109:["Выберите правильное слово.","Дұрыс сөзді таңдаңыз."],
u5r110:["В каждой группе одно слово лишнее. Нажмите на него.","Әр топта бір сөз артық. Соны басыңыз."],
u5r111:["Часть 3 · Речевые функции","3-бөлім · Сөйлеу функциялары"],
u5r112:["Выберите правильную фразу.","Дұрыс сөз тіркесін таңдаңыз."],
u5r113:["Дополните одним словом.","Бір сөзбен толықтырыңыз."],
u5r114:["Расположите три части письма-жалобы в обычном порядке.","Шағым хатының үш бөлігін әдеттегі ретпен қойыңыз."],
u6r101:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
u6r102:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u6r103:["Поставьте глагол в скобках в правильную форму.","Жақша ішіндегі етістікті дұрыс формаға қойыңыз."],
u6r104:["Выберите правильное слово.","Дұрыс сөзді таңдаңыз."],
u6r105:["В каждом предложении одно слово лишнее. Нажмите на него.","Әр сөйлемде бір сөз артық. Соны басыңыз."],
u6r106:["Перепишите предложение так, чтобы смысл не изменился.","Мағынасы өзгермейтіндей етіп сөйлемді қайта жазыңыз."],
u6r107:["Часть 2 · Лексика","2-бөлім · Лексика"],
u6r108:["Дополните каждое предложение одним словом.","Әр сөйлемді бір сөзбен толықтырыңыз."],
u6r109:["Выберите правильное слово.","Дұрыс сөзді таңдаңыз."],
u6r110:["В каждой группе одно слово лишнее. Нажмите на него.","Әр топта бір сөз артық. Соны басыңыз."],
u6r111:["Часть 3 · Речевые функции","3-бөлім · Сөйлеу функциялары"],
u6r112:["Выберите правильную фразу.","Дұрыс сөз тіркесін таңдаңыз."],
u6r113:["Дополните одним словом.","Бір сөзбен толықтырыңыз."],
u6r114:["Расположите три реплики диалога в обычном порядке.","Диалогтың үш репликасын әдеттегі ретпен қойыңыз."],
u7r101:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
u7r102:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u7r103:["Дополните одним словом.","Бір сөзбен толықтырыңыз."],
u7r104:["Выберите правильное прилагательное.","Дұрыс сын есімді таңдаңыз."],
u7r105:["В каждом предложении одно слово лишнее. Нажмите на него.","Әр сөйлемде бір сөз артық. Соны басыңыз."],
u7r106:["Перепишите предложение так, чтобы смысл не изменился.","Мағынасы өзгермейтіндей етіп сөйлемді қайта жазыңыз."],
u7r107:["Часть 2 · Лексика","2-бөлім · Лексика"],
u7r108:["Дополните каждое предложение одним словом или фразой.","Әр сөйлемді бір сөзбен немесе сөз тіркесімен толықтырыңыз."],
u7r109:["Выберите правильное слово.","Дұрыс сөзді таңдаңыз."],
u7r110:["В каждой группе одно слово лишнее. Нажмите на него.","Әр топта бір сөз артық. Соны басыңыз."],
u7r111:["Часть 3 · Речевые функции","3-бөлім · Сөйлеу функциялары"],
u7r112:["Выберите правильную фразу.","Дұрыс сөз тіркесін таңдаңыз."],
u7r113:["Дополните одним словом.","Бір сөзбен толықтырыңыз."],
u7r114:["Расположите три части записки в обычном порядке.","Жазбаның үш бөлігін әдеттегі ретпен қойыңыз."],
u8r101:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
u8r102:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u8r103:["Дополните одним словом или фразой.","Бір сөзбен немесе сөз тіркесімен толықтырыңыз."],
u8r104:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u8r105:["В каждом предложении одно слово лишнее. Нажмите на него.","Әр сөйлемде бір сөз артық. Соны басыңыз."],
u8r106:["Перепишите предложение так, чтобы смысл не изменился.","Мағынасы өзгермейтіндей етіп сөйлемді қайта жазыңыз."],
u8r107:["Часть 2 · Лексика","2-бөлім · Лексика"],
u8r108:["Дополните каждое предложение одним словом.","Әр сөйлемді бір сөзбен толықтырыңыз."],
u8r109:["Выберите правильное слово.","Дұрыс сөзді таңдаңыз."],
u8r110:["В каждой группе одно слово лишнее. Нажмите на него.","Әр топта бір сөз артық. Соны басыңыз."],
u8r111:["Часть 3 · Речевые функции","3-бөлім · Сөйлеу функциялары"],
u8r112:["Выберите правильную фразу.","Дұрыс сөз тіркесін таңдаңыз."],
u8r113:["Дополните одним словом.","Бір сөзбен толықтырыңыз."],
u8r114:["Расположите три реплики диалога в обычном порядке.","Диалогтың үш репликасын әдеттегі ретпен қойыңыз."],
u9r101:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
u9r102:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u9r103:["Поставьте глагол в скобках в правильную форму.","Жақша ішіндегі етістікті дұрыс формаға қойыңыз."],
u9r104:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u9r105:["В каждом предложении одно слово лишнее. Нажмите на него.","Әр сөйлемде бір сөз артық. Соны басыңыз."],
u9r106:["Перепишите предложение так, чтобы смысл не изменился.","Мағынасы өзгермейтіндей етіп сөйлемді қайта жазыңыз."],
u9r107:["Часть 2 · Лексика","2-бөлім · Лексика"],
u9r108:["Дополните каждое предложение одним словом.","Әр сөйлемді бір сөзбен толықтырыңыз."],
u9r109:["Выберите правильное слово.","Дұрыс сөзді таңдаңыз."],
u9r110:["В каждой группе одно слово лишнее. Нажмите на него.","Әр топта бір сөз артық. Соны басыңыз."],
u9r111:["Часть 3 · Речевые функции","3-бөлім · Сөйлеу функциялары"],
u9r112:["Выберите правильную фразу.","Дұрыс сөз тіркесін таңдаңыз."],
u9r113:["Дополните одним словом.","Бір сөзбен толықтырыңыз."],
u9r114:["Расположите три части сопроводительного письма в обычном порядке.","Ілеспе хаттың үш бөлігін әдеттегі ретпен қойыңыз."],
sz001:["Запишите, послушайте себя, затем запишите второй дубль и сравните.","Жазыңыз, өзіңізді тыңдаңыз, содан кейін екінші дубльді жазып, салыстырыңыз."],
sz002:["Каждое правило — одно предложение первого условного типа. Где подходит, используйте must, mustn’t или don’t have to.","Әр ереже — бір бірінші шартты сөйлем. Келетін жерінде must, mustn’t немесе don’t have to қолданыңыз."],
sy001:["Прослушайте всё интервью ещё раз и напишите три предложения о своей неделе, используя most days, usually и hardly ever.","Сұхбатты тағы бір рет тыңдап, өз аптаңыз туралы most days, usually және hardly ever қолданып үш сөйлем жазыңыз."],
sy002:["Скажите минимум три вещи про usually и три про right now.","Usually туралы кемінде үш, right now туралы үш нәрсе айтыңыз."],
sy003:["Затем сравните. Во втором дубле проверьте, что в каждом предложении про «сейчас» есть is / are + -ing.","Содан кейін салыстырыңыз. Екінші дубльде «қазір» туралы әр сөйлемде is / are + -ing бар екенін тексеріңіз."],
sy004:["Правило: /ɪd/ только после -t или -d. Во всех остальных случаях это /t/ или /d/, и лишнего слога не добавляется.","Ереже: /ɪd/ тек -t немесе -d-дан кейін. Қалған жағдайда /t/ немесе /d/, қосымша буын қосылмайды."],
sy005:["Теперь то же самое с where.","Енді дәл солай where-мен."],
sy006:["Почему first floor звучит как firs floor. Только на узнавание.","First floor неге firs floor болып естіледі. Тек тану үшін."],
sy007:["Длинная линия — Past Continuous. Стрелка — Past Simple.","Ұзын сызық — Past Continuous. Көрсеткі — Past Simple."],
sy008:["Теперь одно с while.","Енді while-мен бірін айтыңыз."],
sy009:["Используйте минимум одно while и одно when и назовите одно чувство.","Кемінде бір while және бір when қолданып, бір сезімді атаңыз."],
sy010:["Затем сравните. Во втором дубле используйте минимум два наречия образа действия: calmly, quickly, politely.","Содан кейін салыстырыңыз. Екінші дубльде кемінде екі сын-қимыл үстеуін қолданыңыз: calmly, quickly, politely."],
sy011:["Затем сравните. Дубль 2: разница должна быть слышна — договорённости в Present Continuous, намерения через going to.","Содан кейін салыстырыңыз. 2-дубль: айырмашылық естілсін — келісімдер Present Continuous, ниеттер going to арқылы."],
sy012:["Начните с группы, к которой это относится: a kind of machine / tool / container. Одно это уже половина дела.","Ол қай топқа жататынынан бастаңыз: a kind of machine / tool / container. Осының өзі жарты жұмыс."],
sy013:["Затем сравните. Дубль 2: добавьте одну превосходную степень и одно as … as.","Содан кейін салыстырыңыз. 2-дубль: бір күшейтпелі шырай және бір as … as қосыңыз."],
sy014:["Короткое прилагательное → -er + than. Than здесь безударно: звучит как th’n.","Қысқа сын есім → -er + than. Мұнда than екпінсіз: th’n болып естіледі."],
sy015:["Затем сравните. Дубль 2: используйте just, already и yet по одному разу.","Содан кейін салыстырыңыз. 2-дубль: just, already және yet-ті бір-бір реттен қолданыңыз."],
sy016:["Затем сравните. Дубль 2: каждая просьба должна быть вежливой — Could you…?, никогда I want.","Содан кейін салыстырыңыз. 2-дубль: әр өтініш сыпайы болсын — Could you…?, ешқашан I want емес."],
sy017:["В каждом предложении — своя форма: can, can’t, could, couldn’t, have never been able to, will be able to.","Әр сөйлемде өз формасы: can, can’t, could, couldn’t, have never been able to, will be able to."],
sy018:["Затем сравните. Дубль 2: используйте все три формы — can, could и be able to.","Содан кейін салыстырыңыз. 2-дубль: үш форманы да қолданыңыз — can, could және be able to."],
sy019:["Используйте will и might.","Will және might қолданыңыз."],
sy020:["Каждое правило — одно предложение первого условного типа. Где подходит, используйте must, mustn’t или don’t have to.","Әр ереже — бір бірінші шартты сөйлем. Келетін жерінде must, mustn’t немесе don’t have to қолданыңыз."],
sy021:["Три ошибки, за которыми стоит следить: «If it will rain» (будущее после if) · «If it rains, we stay inside» (пропущено will) · «If it rains, we will to stay» (лишнее to).","Бақылау керек үш қате: «If it will rain» (if-тен кейін келер шақ) · «If it rains, we stay inside» (will жоқ) · «If it rains, we will to stay» (артық to)."],
sy022:["ВПЕРЁД. В уроке 26 остаётся то же настоящее время, но if меняется на when, as soon as и until. Правило времени не меняется.","АЛДА НЕ БАР. 26-сабақта сол осы шақ қалады, бірақ if орнына when, as soon as және until келеді. Шақ ережесі өзгермейді."],
sy023:["Две короткие записи. В первой группе долгий /iː/ как в eat. Во второй — краткий /e/ как в bread.","Екі қысқа жазба. Бірінші топта eat сөзіндегідей ұзын /iː/. Екіншісінде bread сөзіндегідей қысқа /e/."],
sy024:["Затем сравните. Дубль 2: никогда не говорите will сразу после when или as soon as.","Содан кейін салыстырыңыз. 2-дубль: when немесе as soon as-тан кейін бірден will демеңіз."],
sy025:["То же правило времени вы встречали в уроке 25 с if. С глаголами ничего нового не произошло — изменилось только связующее слово.","Дәл сол шақ ережесін 25-сабақта if-пен кездестірдіңіз. Етістіктерде жаңалық жоқ — тек байланыстырушы сөз өзгерді."],
sy026:["Пять абзацев, те же пять задач, что и в образце. Используйте минимум шесть фраз из рамки. Проверьте, что концовка соответствует началу: имя идёт с Yours sincerely, Dear Sir or Madam — с Yours faithfully.","Бес абзац, үлгідегідей бес міндет. Жақтаудан кемінде алты тіркес қолданыңыз. Аяқталуы басталуына сай екенін тексеріңіз: есім Yours sincerely-мен, Dear Sir or Madam — Yours faithfully-мен."],
sy027:["Четыре ошибки, за которыми стоит следить: «You should to rest» · «He shoulds rest» · «I advice you to rest» (advice — существительное, advise — глагол) · «If I was you» (в устойчивой фразе остаётся were).","Бақылау керек төрт қате: «You should to rest» · «He shoulds rest» · «I advice you to rest» (advice — зат есім, advise — етістік) · «If I was you» (тұрақты тіркесте were қалады)."],
sy028:["ВПЕРЁД. If I were you, I’d… — это второе условное. На этом уровне выучите его как целую фразу и меняйте только часть после I’d. В 11-м юните разберём по частям.","АЛДА НЕ БАР. If I were you, I’d… — бұл екінші шартты сөйлем. Бұл деңгейде оны тұтас тіркес ретінде жаттап, тек I’d-тан кейінгі бөлігін өзгертіңіз. 11-бөлімде талданады."],
sy029:["Затем сравните. Дубль 2: после did никакого -d — didn’t use to, а не didn’t used to.","Содан кейін салыстырыңыз. 2-дубль: did-тен кейін -d жоқ — didn’t use to, didn’t used to емес."],
sy030:["Услышьте понижение тона на but и произнесите так же.","But сөзіндегі дауыс ырғағының төмендеуін естіп, дәл солай айтыңыз."],
sy031:["Настоящие предложения из аудиозаписи учебника.","Оқулық жазбасындағы нақты сөйлемдер."],
sx001:["Настоящие вопросы из аудиозаписи учебника.","Оқулық жазбасындағы нақты сұрақтар."],
sx002:["Пример: What does you do? → do","Мысалы: What does you do? → do"],
sx003:["Пример: She lives in Almaty. → Where does she live?","Мысалы: She lives in Almaty. → Where does she live?"],
sx004:["Впишите пропущенные слова. Смысл менять нельзя.","Түсіп қалған сөздерді жазыңыз. Мағынасын өзгертпеңіз."],
sx005:["Минимум два вопроса — о прошлом. Каждый раз используйте новое вопросительное слово.","Кемінде екеуі өткен шақ туралы болсын. Әр жолы басқа сұрау сөзін қолданыңыз."],
sx006:["Где вы живёте и с кем? · Чем вы занимаетесь и как долго? · Что вы делали на выходных? · София говорит, что хорошему вопросу нужен хороший слушатель. Согласны?","Қайда және кіммен тұрасыз? · Немен айналысасыз және қанша уақыт? · Демалыста не істедіңіз? · София жақсы сұраққа жақсы тыңдаушы керек дейді. Келісесіз бе?"],
sx007:["Какое из двух исследований удивило вас больше? Напишите два предложения.","Екі зерттеудің қайсысы сізді көбірек таңғалдырды? Екі сөйлем жазыңыз."],
sx008:["Сначала запишите. В конце вы сверите свою работу со списком.","Алдымен жазып алыңыз. Соңында өз жұмысыңызды тізіммен салыстырасыз."],
sx009:["Ответьте вслух на три из этих пяти вопросов о себе. Не читайте написанное — говорите.","Осы бес сұрақтың үшеуіне өзіңіз туралы дауыстап жауап беріңіз. Жазғаныңызды оқымаңыз — сөйлеңіз."],
sx010:["Затем сравните. Во втором дубле добавьте к каждому ответу причину: «… because …».","Содан кейін салыстырыңыз. Екінші дубльде әр жауапқа себеп қосыңыз: «… because …»."],
sx013:["Ваша неделя, записанная как следует, — потом прочитайте вслух.","Аптаңызды дұрыстап жазыңыз — содан кейін дауыстап оқыңыз."],
sx014:["Опишите обычный вторник, от пробуждения до сна.","Кәдімгі сейсенбіні — оянғаннан ұйқыға дейін — сипаттаңыз."],
sx015:["Затем сравните. Посчитайте наречия частотности в первом дубле. Во втором используйте на два больше.","Содан кейін салыстырыңыз. Бірінші дубльдегі жиілік үстеулерін санаңыз. Екіншісінде екеуін көбірек қолданыңыз."],
sx016:["Прослушайте всех троих ещё раз. Затем напишите три предложения о своём любимом времени года, используя три разных выражения со шкалы.","Үшеуін де тағы тыңдаңыз. Содан кейін шкаладағы үш түрлі тіркесті қолданып, өзіңіздің сүйікті мезгіліңіз туралы үш сөйлем жазыңыз."],
sx017:["Друг из другой страны хочет приехать в ваш регион. Скажите, когда приезжать, а когда лучше не стоит.","Шетелдегі досыңыз аймағыңызға келгісі келеді. Қашан келу керегін және қашан келмеу керегін айтыңыз."],
sx018:["Затем сравните. Дубль 2: скажите без остановок и закончите одной ясной рекомендацией.","Содан кейін салыстырыңыз. 2-дубль: тоқтамай айтып, бір нақты ұсыныспен аяқтаңыз."],
sx019:["Теперь та же мысль в другом времени.","Енді сол ойды басқа шақта айтыңыз."],
sx021:["Три из них — люди.","Үшеуі — адамдар."],
sx022:["Три описывают место.","Үшеуі орынды сипаттайды."],
sx023:["Три — это места, где можно стоять.","Үшеуі — тұруға болатын орындар."],
sx024:["Посмотрите в окно или представьте свою улицу. Опишите, что там происходит обычно и что происходит прямо сейчас.","Терезеден қараңыз немесе көшеңізді елестетіңіз. Онда әдетте не болатынын және дәл қазір не болып жатқанын сипаттаңыз."],
sx026:["Теперь одно про место.","Енді орын туралы бірін айтыңыз."],
sx027:["Никогда не называйте само слово. Три подсказки — и пусть партнёр угадает.","Сөздің өзін ешқашан атамаңыз. Үш нұсқау беріп, серіктесіңіз тапсын."],
sx028:["Выберите три предмета в комнате. Опишите каждый, не называя его.","Бөлмедегі үш затты таңдаңыз. Әрқайсысын атын атамай сипаттаңыз."],
sx029:["Затем сравните. Дубль 2: опишите те же три предмета меньшим числом слов.","Содан кейін салыстырыңыз. 2-дубль: сол үш затты азырақ сөзбен сипаттаңыз."],
sx030:["Прослушайте последние несколько секунд каждой записи.","Әрқайсысының соңғы бірнеше секундын тыңдаңыз."],
sx031:["Друг стоит на ближайшей остановке и идёт к вам. Проговорите весь маршрут вслух, по одному указанию.","Досыңыз жақын аялдамада тұр және сізге келе жатыр. Бүкіл бағытты бір-бірлеп дауыстап айтыңыз."],
sx032:["Затем сравните. Прослушайте первый дубль. Смог бы по нему пройти незнакомый человек? Исправьте непонятный поворот во втором.","Содан кейін салыстырыңыз. Бірінші дубльді тыңдаңыз. Бейтаныс адам осымен жүре ала ма? Екіншісінде түсініксіз бұрылысты түзетіңіз."],
sx034:["Нажимайте на слова в правильном порядке. Нажмите ещё раз, чтобы убрать слово.","Сөздерді дұрыс ретпен басыңыз. Қайта бассаңыз, сөз алынады."],
sx036:["Грамматика в контексте. Сначала прочитайте весь текст, потом заполните пропуски.","Мәтінмәндегі грамматика. Алдымен бүкіл мәтінді оқып, содан кейін бос орындарды толтырыңыз."],
sx037:["Эти пять слов держат рассказ вместе. Используйте минимум три.","Осы бес сөз әңгімені бір-біріне байлайды. Кемінде үшеуін қолданыңыз."],
sx038:["Три из них — то, что можно потрогать.","Үшеуі — қолмен ұстауға болатын нәрселер."],
sx039:["Три указывают направление.","Үшеуі бағытты көрсетеді."],
sx040:["Расскажите историю прыжка с края космоса своими словами, в том порядке, в каком всё происходило. Не читайте текст.","Ғарыш шетінен секіру оқиғасын өз сөзіңізбен, болған ретімен айтыңыз. Мәтінді оқымаңыз."],
sx041:["Затем сравните. Дубль 2: добавьте два выражения времени и уберите повторённое предложение.","Содан кейін салыстырыңыз. 2-дубль: екі уақыт тіркесін қосып, қайталанған сөйлемді алып тастаңыз."],
sx043:["В каждом из них звук прячется, потому что дальше идёт согласный. Попробуйте next April или found it — и услышите, как -t и -d возвращаются.","Әрқайсысында дыбыс жасырынады, өйткені артынан дауыссыз келеді. Next April немесе found it деп көріңіз — -t пен -d қайта естіледі."],
sx047:["Расскажите короткую правдивую историю о том, как вас что-то прервало.","Сізді бірдеңе бөліп жіберген сәт туралы қысқа шынайы әңгіме айтыңыз."],
sx049:["Рассказчик: начните с зачина, добавьте одно предложение с when или while и завершающую фразу. Слушатель: отреагируйте минимум три раза.","Айтушы: бастама тіркесін, when немесе while бар бір сөйлемді және қорытынды жолды қолданыңыз. Тыңдаушы: кемінде үш рет реакция беріңіз."],
sx050:["Расскажите вслух свою худшую историю о путешествии, потом скажите, как отреагировал бы друг.","Ең жаман сапар оқиғаңызды дауыстап айтып, досыңыз қалай реакция беретінін айтыңыз."],
sx051:["Затем сравните. Дубль 2: начните с фразы выше и уложитесь в минуту.","Содан кейін салыстырыңыз. 2-дубль: жоғарыдағы тіркестен бастап, бір минутқа сыйғызыңыз."],
sx052:["Перемена, которую вы бы сделали, если бы никто не смотрел.","Ешкім қарамаса, сіз жасайтын өзгеріс."],
sx053:["Сорокалетний друг хочет уйти с надёжной работы и переучиться на что-то совсем другое. Скажите, что вы думаете.","Қырықтағы досыңыз тұрақты жұмысын тастап, мүлде басқа мамандыққа оқығысы келеді. Не ойлайтыныңызды айтыңыз."],
sx054:["Затем сравните. Дубль 2: используйте три разные глагольные конструкции из этого урока.","Содан кейін салыстырыңыз. 2-дубль: осы сабақтағы үш түрлі етістік құрылымын қолданыңыз."],
sx055:["Ответьте письменно на оба вопроса, по два-три предложения на каждый.","Екеуіне де екі-үш сөйлеммен жазбаша жауап беріңіз."],
sx056:["Ваша настоящая неделя и тридцать дней после неё.","Нақты аптаңыз және одан кейінгі отыз күн."],
sx057:["Расскажите о следующей неделе: что уже назначено, а что вы только собираетесь сделать.","Келесі апта туралы айтыңыз: не келісілген, ал нені тек ниет етіп отырсыз."],
sx059:["Пригласите, получите отказ и всё равно договоритесь.","Шақырыңыз, бас тартуды естіңіз және бәрібір келісіңіз."],
sx060:["Проговорите обе стороны разговора: вы приглашаете друга, друг вежливо отказывается, вы предлагаете другое время.","Әңгіменің екі жағын да айтыңыз: сіз досыңызды шақырасыз, ол сыпайы бас тартады, сіз басқа уақыт ұсынасыз."],
sx061:["Затем сравните. Дубль 2: сделайте отказ дружелюбнее, не меняя самого ответа.","Содан кейін салыстырыңыз. 2-дубль: жауапты өзгертпей, бас тартуды жылырақ етіп айтыңыз."],
sx062:["три о размере","үшеуі мөлшер туралы"],
sx063:["три — цвета","үшеуі — түстер"],
sx064:["три — материалы","үшеуі — материалдар"],
sx065:["три — мнения","үшеуі — пікірлер"],
sx066:["три о возрасте","үшеуі жас туралы"],
sx067:["Некоторые из них есть в записи.","Кейбіреуі жазбада кездеседі."],
sx068:["Выберите пять предметов вокруг вас, которые рассказали бы незнакомцу, кто вы. Опишите их и скажите, почему выбрали именно их.","Айналаңыздан бейтаныс адамға сіз туралы айтып бере алатын бес затты таңдаңыз. Оларды сипаттап, неге таңдағаныңызды айтыңыз."],
sx069:["Затем сравните. Прослушайте первый дубль и посчитайте артикли. Исправьте ошибки во втором.","Содан кейін салыстырыңыз. Бірінші дубльді тыңдап, артикльдерді санаңыз. Екіншісінде қателерді түзетіңіз."],
sx070:["a / an — вы упоминаете это впервые. Слушатель ещё не знает, о чём речь.","a / an — сіз бұл туралы алғаш рет айтасыз. Тыңдаушы оны әлі білмейді."],
sx071:["В тексте были тот, кто копит, тот, кто тратит, и тот, кто не следит за мелкими суммами. Скажите, кто из них вы и кто — кто-то в вашей семье.","Мәтінде жинайтын, жұмсайтын және ұсақ сомаға мән бермейтін адам болды. Солардың қайсысы сіз екеніңізді және отбасыңыздағы біреу кім екенін айтыңыз."],
sx072:["Затем сравните. Дубль 2: используйте четыре разных квантификатора.","Содан кейін салыстырыңыз. 2-дубль: төрт түрлі мөлшер сөзін қолданыңыз."],
sx073:["a little + неисчисляемое = небольшое количество, и это нормально.","a little + саналмайтын зат есім = аз мөлшер, бұл қалыпты жағдай."],
sx074:["Вспомните три вещи, английского названия которых вы не знаете. Объясните каждую так, чтобы слушателю стало понятно.","Ағылшынша атауын білмейтін үш нәрсені ойлаңыз. Әрқайсысын тыңдаушыға түсінікті болғанша түсіндіріңіз."],
sx075:["Затем сравните. Дубль 2: объясните каждую двумя предложениями вместо четырёх.","Содан кейін салыстырыңыз. 2-дубль: әрқайсысын төрт емес, екі сөйлеммен түсіндіріңіз."],
sx077:["Сравните двух людей, которых хорошо знаете: одного молчаливого и одного разговорчивого.","Жақсы білетін екі адамды салыстырыңыз: біреуі үнсіз, екіншісі көп сөйлейді."],
sx080:["Расскажите о месте, где вы прожили дольше всего, и об одном месте, где жили раньше.","Ең ұзақ тұрған жеріңіз және бұрын тұрған бір жеріңіз туралы айтыңыз."],
sx081:["Затем сравните. Дубль 2: завершённое время — Past Simple, незавершённое — Present Perfect.","Содан кейін салыстырыңыз. 2-дубль: аяқталған уақыт — Past Simple, аяқталмаған — Present Perfect."],
sx082:["Present Perfect: закончилось только что и до сих пор важно. Без слова времени.","Present Perfect: жаңа ғана аяқталды және әлі де маңызды. Уақыт сөзінсіз."],
sx083:["Сообщите вслух три новости и отреагируйте на каждую за собеседника.","Үш жаңалықты дауыстап айтып, әрқайсысына сұхбаттасыңыздың атынан реакция беріңіз."],
sx085:["just = только что. Ставится между have и причастием.","just = жаңа ғана. Have мен есімше арасына қойылады."],
sx086:["Ваш город через двадцать лет — записано и обосновано.","Жиырма жылдан кейінгі қалаңыз — жазылған және дәлелденген."],
sx087:["Спрогнозируйте, как люди будут передвигаться по вашему городу через двадцать лет.","Жиырма жылдан кейін қалаңызда адамдар қалай жүретінін болжаңыз."],
sx088:["Затем сравните. Дубль 2: уверенные и неуверенные прогнозы должны звучать по-разному.","Содан кейін салыстырыңыз. 2-дубль: сенімді және сенімсіз болжамдар әртүрлі естілсін."],
sx089:["Одна неделя, один бюджет и три человека с разными желаниями.","Бір апта, бір бюджет және қалауы әртүрлі үш адам."],
sx090:["Три друга хотят разного отпуска: один — куда-то жаркое, другой — в глушь, где нечего делать, третий — в город. Отстаивайте один вариант и придите к решению.","Үш дос әртүрлі демалыс қалайды: біреуі — ыстық жерге, екіншісі — ештеңе жоқ шалғайға, үшіншісі — қалаға. Бір нұсқаны қорғап, шешімге келіңіз."],
sx091:["Затем сравните. Дубль 2: закончите решением в одном ясном предложении.","Содан кейін салыстырыңыз. 2-дубль: шешімді бір анық сөйлеммен айтып аяқтаңыз."],
sx092:["Заселитесь, пожалуйтесь и оставьте записку.","Тіркеліңіз, шағымданыңыз және хабарлама қалдырыңыз."],
sx093:["Проговорите обе роли: приезд в отель, затем сообщение о проблеме с номером.","Екі рөлді де айтыңыз: қонақүйге келу, содан кейін бөлмедегі мәселе туралы хабарлау."],
sx095:["Настоящие предложения из грамматической аудиозаписи учебника.","Оқулықтың грамматика жазбасындағы нақты сөйлемдер."],
sx096:["Пример: I can drive. → I am able to drive.","Мысалы: I can drive. → I am able to drive."],
sx098:["В тексте сказано, что таксисты развили свою способность. Напишите об одной способности, которую развили вы, и об одной, которую хотели бы развить. Около 80 слов.","Мәтінде таксишілер қабілетін дамытқаны айтылады. Өзіңіз дамытқан бір қабілет және дамытқыңыз келетін бір қабілет туралы жазыңыз. Шамамен 80 сөз."],
sx099:["В какой миф из текста вы верили до сегодняшнего дня? Напишите два предложения.","Мәтіндегі қай мифке бүгінге дейін сендіңіз? Екі сөйлем жазыңыз."],
sx100:["Запишите, потом произнесите вслух. В конце проверите сами.","Жазып алыңыз, содан кейін дауыстап айтыңыз. Соңында өзіңіз тексересіз."],
sx101:["Расскажите о навыке, которого у вас раньше не было, а теперь есть.","Бұрын істей алмайтын, ал енді істей алатын дағдыңыз туралы айтыңыз."],
sx103:["Пример: It is not necessary to come. → You don’t have to come.","Мысалы: It is not necessary to come. → You don’t have to come."],
sx104:["Три из них — предметы.","Үшеуі — пәндер."],
sx105:["Три — это документ, который выдают в конце.","Үшеуі — соңында берілетін құжат."],
sx106:["Три — это места.","Үшеуі — орындар."],
sx107:["Три — прилагательные.","Үшеуі — сын есімдер."],
sx108:["Сработала бы такая система в вашей стране? Напишите два предложения.","Мұндай жүйе сіздің еліңізде жұмыс істер ме еді? Екі сөйлем жазыңыз."],
sx109:["Придумайте правила сами, потом проверьте свою работу.","Ережелерді өзіңіз ойлап тауып, содан кейін жұмысыңызды тексеріңіз."],
sx110:["Опишите правила школы, которую вы знаете, потом скажите, какое правило вы бы оставили, а какое убрали.","Өзіңіз білетін мектептің ережелерін сипаттап, қайсысын қалдырып, қайсысын алып тастайтыныңызды айтыңыз."],
sx111:["Затем сравните. Дубль 2: осторожно — don’t have to и mustn’t значат не одно и то же.","Содан кейін салыстырыңыз. 2-дубль: абай болыңыз — don’t have to мен mustn’t бірдей емес."],
sx112:["Настоящие фразы из аудиозаписи учебника.","Оқулық жазбасындағы нақты тіркестер."],
sx113:["Прослушайте звонок ещё раз, потом заполните свою собственную анкету.","Қоңырауды тағы бір рет тыңдап, өз сауалнамаңызды толтырыңыз."],
sx114:["Проговорите обе стороны телефонного разговора: вы записываетесь на курс и спрашиваете про два непонятных слова.","Телефон әңгімесінің екі жағын да айтыңыз: сіз курсқа жазыласыз және түсінбеген екі сөз туралы сұрайсыз."],
sx115:["Затем сравните. Дубль 2: попросите объяснить, не извиняясь три раза.","Содан кейін салыстырыңыз. 2-дубль: үш рет кешірім сұрамай, түсіндіруді өтініңіз."],
sx116:["Выберите одно, потом запишите свой ответ ниже.","Біреуін таңдап, жауабыңызды төменге жазыңыз."],
sx117:["Прочитайте предложение целиком, прежде чем выбирать. Слова близки, но подходит только одно.","Таңдамас бұрын сөйлемді толық оқыңыз. Сөздер ұқсас, бірақ біреуі ғана келеді."],
sx118:["В английском некоторые слова закреплены друг за другом. Учить пару быстрее, чем слово отдельно.","Ағылшын тілінде кейбір сөздер бір-бірімен бекітілген. Жұпты жаттау сөзді жеке жаттаудан жылдам."],
sx119:["Пять предложений из текста. Прочитайте каждое и найдите два глагола.","Мәтіннен бес сөйлем. Әрқайсысын оқып, екі етістікті табыңыз."],
sx120:["Первая половина — условие. Напишите предложение целиком.","Бірінші жартысы — шарт. Сөйлемді толық жазыңыз."],
sx121:["easier = остальное будет легче · angry = никто не будет злиться · bump = в офисах будут здороваться локтями · late = мы опоздаем на час · tickets = билеты будут дешевле · hands = вы, скорее всего, пожмёте руку","easier = қалғаны жеңілірек болады · angry = ешкім ашуланбайды · bump = кеңселерде шынтақпен амандасады · late = біз бір сағат кешігеміз · tickets = билеттер арзандайды · hands = сіз қол алысасыз"],
sx122:["Это офисные правила, стоящие за приветствиями. Вы встречали их в 8-м юните.","Бұл — амандасудың артындағы кеңсе ережелері. Оларды 8-бөлімде кездестірдіңіз."],
sx123:["Одна минута. Больше пока ничего не пишите.","Бір минут. Әзірге басқа ештеңе жазбаңыз."],
sx124:["weapon = откуда это пошло · stopped = год, когда всё изменилось · replace = что люди делают вместо этого · rules = что делать сейчас · warm = правило за правилом","weapon = қайдан шыққаны · stopped = бәрі өзгерген жыл · replace = адамдар оның орнына не істейді · rules = қазір не істеу керек · warm = ереженің артындағы ереже"],
sx125:["Выберите одно. В тексте есть один популярный ответ — проверьте, совпал ли он с вашим.","Біреуін таңдаңыз. Мәтінде бір танымал жауап бар — сіздікімен сәйкес келді ме, тексеріңіз."],
sx128:["Расскажите о приветствиях там, где вы живёте, и о том, что будет, если они изменятся.","Тұратын жеріңіздегі амандасу туралы және ол өзгерсе не болатыны туралы айтыңыз."],
sx129:["Затем сравните. Дубль 2: используйте два первых условных предложения.","Содан кейін салыстырыңыз. 2-дубль: екі бірінші шартты сөйлем қолданыңыз."],
sx132:["Правильного ответа нет. Расставьте по порядку, потом напишите одну строку о своём первом выборе.","Дұрыс жауап жоқ. Ретімен қойып, бірінші таңдауыңыз туралы бір жол жазыңыз."],
sx133:["Эти семь глаголов всегда идут с одним и тем же коротким словом. Учите пару, а не глагол.","Осы жеті етістік әрқашан бір ғана шағын сөзбен келеді. Етістікті емес, жұпты жаттаңыз."],
sx134:["Пять предложений из Navigate B1, аудио 9.4. Нажмите Listen, чтобы услышать каждое в звонке.","Navigate B1, 9.4 аудиосынан бес сөйлем. Әрқайсысын қоңырауда есту үшін Listen басыңыз."],
sx136:["Те же две буквы, два звука. Правила нет — звук принадлежит слову, поэтому учите его вместе со словом.","Сол екі әріп, екі дыбыс. Ереже жоқ — дыбыс сөзге тән, сондықтан оны сөзбен бірге жаттаңыз."],
sx137:["when = вы уверены, что это произойдёт · if = вы не уверены.","when = болатынына сенімдісіз · if = сенімді емессіз."],
sx138:["Как вы думаете, нужно ли быть в форме до начала? Выберите вариант, потом послушайте и проверьте.","Сіздіңше, бастамас бұрын дене шынықтыру керек пе? Біреуін таңдап, тыңдап тексеріңіз."],
sx139:["Восемь моментов в звонке. Нажмите на любой, чтобы прослушать только эту часть.","Қоңыраудағы сегіз сәт. Тек сол бөлігін тыңдау үшін кез келгенін басыңыз."],
sx140:["Сначала предположите. Догадка заставляет слушать ради ответа.","Алдымен болжаңыз. Болжам жауапты іздеп тыңдауға мәжбүрлейді."],
sx141:["В каждом используйте своё слово времени.","Әрқайсысында басқа уақыт сөзін қолданыңыз."],
sx142:["Шесть шагов, шесть разных связующих слов. Обратите внимание на тот, где нужно if, а не when, — и будьте готовы объяснить почему.","Алты қадам, алты түрлі байланыстырушы сөз. When емес, if керек болатынына назар аударыңыз — және неге екенін түсіндіруге дайын болыңыз."],
sx143:["Вы проведёте неделю без телефона и интернета. Скажите, что вы будете делать.","Сіз бір аптаны телефонсыз және интернетсіз өткізесіз. Не істейтініңізді айтыңыз."],
sx145:["Три ошибки, за которыми стоит следить: «when I will arrive» · «until she will come» · «After I will finish, I go home» (обе половины неверны).","Бақылау керек үш қате: «when I will arrive» · «until she will come» · «After I will finish, I go home» (екі жағы да қате)."],
sx147:["Выберите одно, потом напишите совет, который вы бы дали.","Біреуін таңдап, беретін кеңесіңізді жазыңыз."],
sx148:["Это самая частая ошибка именно с этим словом.","Дәл осы сөзбен жіберілетін ең жиі қате."],
sx149:["Пять предложений из Navigate B1, аудио 9.8. Нажмите Listen, чтобы услышать каждое.","Navigate B1, 9.8 аудиосынан бес сөйлем. Әрқайсысын есту үшін Listen басыңыз."],
sx150:["coffee = You should try to drink less coffee · heavy = You mustn’t lift anything heavy · cream = You could try this cream · still = You must try to keep still · page = If I were you, I’d stick to one page · early = Why don’t you apply today?","coffee = You should try to drink less coffee · heavy = You mustn’t lift anything heavy · cream = You could try this cream · still = You must try to keep still · page = If I were you, I’d stick to one page · early = Why don’t you apply today?"],
sx151:["which = какая вакансия и где вы её увидели · what = что вы делали до сих пор · why = почему эта компания и почему вы · attached = что вы прилагаете и когда свободны · close = вежливое окончание","which = қай жұмыс және оны қайдан көрдіңіз · what = осы уақытқа дейін не істедіңіз · why = неге осы компания және неге сіз · attached = не жіберіп отырсыз және қашан боссыз · close = сыпайы аяқтау"],
sx152:["Оба варианта значат одно и то же. Для этого жанра подходит только один.","Екі нұсқа да бір мағына береді. Бұл жанрға тек біреуі келеді."],
sx153:["back = больная спина · bites = укусы насекомых на руках и ногах · arm = сломанная рука у ребёнка","back = ауырған арқа · bites = қол мен аяқтағы жәндік шаққан жерлер · arm = баланың сынған қолы"],
sx154:["Нажмите на номер, чтобы услышать фразу ещё раз. Navigate B1 · Аудио 9.8","Тіркесті қайта есту үшін нөмірді басыңыз. Navigate B1 · 9.8 аудио"],
sx155:["Четыре проблемы, четыре разные формы.","Төрт мәселе, төрт түрлі форма."],
sx157:["Три человека просят у вас совета: один вымотан, другой ненавидит свою работу, у третьего экзамен на следующей неделе. Ответьте каждому вслух.","Үш адам сізден кеңес сұрайды: біреуі шаршаған, екіншісі жұмысын жек көреді, үшіншісінің келесі аптада емтихан бар. Әрқайсысына дауыстап жауап беріңіз."],
sx158:["Затем сравните. Дубль 2: не используйте одну и ту же фразу совета дважды.","Содан кейін салыстырыңыз. 2-дубль: бір кеңес тіркесін екі рет қолданбаңыз."],
sx161:["Опишите блюдо из детства так ясно, чтобы слушателю захотелось его попробовать.","Балалық шағыңыздағы тағамды тыңдаушының дәмін татқысы келетіндей анық сипаттаңыз."],
sx162:["Затем сравните. Дубль 2: начните два предложения с формы на -ing.","Содан кейін салыстырыңыз. 2-дубль: екі сөйлемді -ing формасынан бастаңыз."],
sx163:["Объясните, как делают или готовят что-то знакомое, от начала до полки в магазине.","Таныс бір нәрсенің қалай жасалатынын немесе дайындалатынын басынан дүкен сөресіне дейін түсіндіріңіз."],
sx164:["Затем сравните. Дубль 2: используйте пассив минимум четыре раза.","Содан кейін салыстырыңыз. 2-дубль: ырықсыз етісті кемінде төрт рет қолданыңыз."],
sx165:["Проговорите обе роли: посетитель с проблемой в ресторане и официант, который отвечает.","Екі рөлді де айтыңыз: мейрамханада мәселесі бар қонақ және жауап беретін даяшы."],
sx166:["Затем сравните. Дубль 2: жалуйтесь твёрдо, но вежливо — грубые слова не нужны.","Содан кейін салыстырыңыз. 2-дубль: батыл, бірақ сыпайы шағымданыңыз — дөрекі сөз қажет емес."],
sx167:["Собственные слова судьи из аудиозаписи учебника.","Оқулық жазбасындағы судьяның өз сөздері."],
sx168:["Назовите одну вещь, которую вы бы изменили в мире, и скажите, что было бы потом.","Әлемде өзгертетін бір нәрсені атап, содан кейін не болатынын айтыңыз."],
sx169:["Затем сравните. Дубль 2: используйте if + Past Simple + would минимум три раза.","Содан кейін салыстырыңыз. 2-дубль: if + Past Simple + would-ты кемінде үш рет қолданыңыз."],
sx170:["Прочитайте каждое вслух, прежде чем идти дальше.","Әрі қарай жүрместен бұрын әрқайсысын дауыстап оқыңыз."],
sx171:["Расскажите, как изменилась повседневная жизнь вашей семьи за одну человеческую жизнь.","Отбасыңыздың күнделікті өмірі бір адамның ғұмырында қалай өзгергенін айтыңыз."],
sx174:["Произнесите девяностосекундную речь о месте, которое стоит посетить. Потом ответьте на один вопрос, который вы представляете от слушателей.","Баруға тұрарлық орын туралы тоқсан секундтық сөз сөйлеңіз. Содан кейін тыңдаушылардан келеді деп ойлаған бір сұраққа жауап беріңіз."],
sx175:["Затем сравните. Дубль 2: сократите на десять секунд, сохранив все части структуры.","Содан кейін салыстырыңыз. 2-дубль: он секундқа қысқартып, құрылымның барлық бөлігін сақтаңыз."],
sx176:["Расскажите, как долго вы занимаетесь главными вещами в своей жизни.","Өміріңіздегі негізгі істермен қанша уақыттан бері айналысатыныңызды айтыңыз."],
sx177:["Затем сравните. Дубль 2: for — период, since — точка. Проверьте каждое.","Содан кейін салыстырыңыз. 2-дубль: for — кезең, since — нүкте. Әрқайсысын тексеріңіз."],
sx178:["Опишите работу, которую хорошо знаете, — не должность, а реальный день.","Жақсы білетін жұмысты сипаттаңыз — лауазымды емес, нақты күнді."],
sx179:["Затем сравните. Дубль 2: начните три предложения с to + глагол: to check, to write, to answer.","Содан кейін салыстырыңыз. 2-дубль: үш сөйлемді to + етістіктен бастаңыз: to check, to write, to answer."],
sx181:["Собственные слова Даниэль из записи.","Жазбадағы Даниэльдің өз сөздері."],
sx182:["Ответьте вслух на эти пять вопросов с собеседования, опираясь на своё резюме из этого урока.","Осы сабақтағы түйіндемеңізге сүйеніп, сұхбаттың бес сұрағына дауыстап жауап беріңіз."],
sx183:["Затем сравните. Дубль 2: ответьте на вопрос о слабой стороне двумя предложениями — слабость и что вы с ней делаете.","Содан кейін салыстырыңыз. 2-дубль: әлсіз тұс туралы сұраққа екі сөйлеммен жауап беріңіз — әлсіздік және онымен не істейтіңіз."],
r1309:["Работайте в парах. Спрашивайте и отвечайте.","Жұпта жұмыс істеңіз. Сұрақ қойып, жауап беріңіз."],
e505:["Работайте в парах. Спрашивайте и отвечайте.","Жұпта жұмыс істеңіз. Сұрақ қойып, жауап беріңіз."],
u4a04:["Обсудите это","Мұны талқылаңыз"],
u4h04:["Преподаватель","Мұғалім"],
u5a05:["Обсудите это","Мұны талқылаңыз"],
u5f09:["Запишите","Жазып алыңыз"],
u5g03:["Преподаватель","Мұғалім"],
u5h04:["Преподаватель","Мұғалім"],
u6a04:["Обсудите это","Мұны талқылаңыз"],
u6g04:["3 · Кому адресована каждая строка?","3 · Әр жол кімге арналған?"],
u6g05:["Маршрут один и тот же. Читатель — разный.","Бағыт бірдей. Оқырман басқа."],
u6h04:["Преподаватель","Мұғалім"],
u7d10:["ЗНАЧЕНИЕ И УПОТРЕБЛЕНИЕ. Past Simple — о завершённом действии в завершённое время.","МАҒЫНАСЫ МЕН ҚОЛДАНЫСЫ. Past Simple — аяқталған уақыттағы аяқталған әрекет туралы."],
u7d11:["КОГДА ЕГО НЕ УПОТРЕБЛЯЮТ. Если время не завершено или вы не называете его, английский выбирает другое время.","ҚАШАН ҚОЛДАНЫЛМАЙДЫ. Уақыт аяқталмаса немесе аталмаса, ағылшын тілі басқа шақты таңдайды."],
u8a05:["Обсудите это","Мұны талқылаңыз"],
u8h04:["Преподаватель","Мұғалім"],
u9a04:["Обсудите это","Мұны талқылаңыз"],
u9h05:["Преподаватель","Мұғалім"],
r1301:["Перед чтением: музей просит выбрать пять предметов из дома, которые расскажут о вас незнакомому человеку. Что вы выберете первым?","Оқу алдында: мұражай үйіңізден бейтаныс адамға сіз туралы айтатын бес затты таңдауды сұрайды. Алдымен нені таңдайсыз?"],
r1302:["Это предположение, а не ответ. Читайте и посмотрите, что выбрал автор.","Бұл болжам, жауап емес. Оқып, автордың нені таңдағанын көріңіз."],
r1303:["1 · Прочитайте один раз ради общего смысла. Выберите лучший ответ.","1 · Жалпы мағынасын түсіну үшін бір рет оқыңыз. Ең дұрыс жауапты таңдаңыз."],
r1304:["2 · Прочитайте ещё раз ради деталей. Ответьте одним-двумя словами.","2 · Егжей-тегжейін білу үшін қайта оқыңыз. Бір-екі сөзбен жауап беріңіз."],
r1305:["3 · Верно или неверно?","3 · Дұрыс па, бұрыс па?"],
r1306:["4 · Найдите в тексте слово, которое означает…","4 · Мәтіннен мағынасы сәйкес сөзді табыңыз…"],
r1307:["5 · Артикли в тексте. Почему автор выбрал именно этот?","5 · Мәтіндегі артикльдер. Автор неге дәл осыны таңдады?"],
r1308:["Прежде чем отвечать, вернитесь к предложению.","Жауап бермес бұрын сөйлемге қайта қараңыз."],
r1310:["Ответьте двумя-тремя предложениями.","Екі-үш сөйлеммен жауап беріңіз."],
e500:["Перед чтением: ООН попросила людей почти во всех странах выбрать шесть вещей, которые больше всего изменили бы их жизнь. Что, по-вашему, оказалось на первом месте?","Оқу алдында: БҰҰ барлық дерлік елдердегі адамдардан өмірлерін ең көп өзгертетін алты нәрсені таңдауды сұрады. Сіздіңше, бірінші орында не болды?"],
e500b:["Это предположение, а не ответ. Ответ — во втором абзаце.","Бұл болжам, жауап емес. Жауап екінші абзацта."],
e502:["2 · Прочитайте ещё раз ради деталей. Верно или неверно?","2 · Егжей-тегжейін білу үшін қайта оқыңыз. Дұрыс па, бұрыс па?"],
e503:["3 · Найдите слово в тексте.","3 · Мәтіннен сөзді табыңыз."],
e504:["4 · Найдите второе условное. Дополните два предложения из третьего абзаца.","4 · Екінші шартты сөйлемді табыңыз. Үшінші абзацтағы екі сөйлемді толықтырыңыз."],
e506:["Ответьте двумя-тремя предложениями.","Екі-үш сөйлеммен жауап беріңіз."],
gx001:["✓ · Запишите ответ на собеседовании правильно.","✓ · Сұхбаттағы жауапты дұрыс жазыңыз."],
gx002:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
gx003:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
gx004:["Теперь говорите — задайте эти вопросы партнёру и ответьте на них.","Енді сөйлеңіз — осы сұрақтарды серіктесіңізге қойып, жауап беріңіз."],
gx005:["Ответьте на эти два вопроса вслух, прежде чем идти дальше.","Әрі қарай жүрместен бұрын осы екі сұраққа дауыстап жауап беріңіз."],
gx006:["✓ · Перепишите предложение с to + глагол.","✓ · Сөйлемді to + етістік арқылы қайта жазыңыз."],
gx007:["✓ · Перепишите предложение в Present Perfect.","✓ · Сөйлемді Present Perfect шағында қайта жазыңыз."],
gx008:["✓ · Выразите ту же мысль вежливее или яснее.","✓ · Сол ойды сыпайырақ немесе анығырақ жеткізіңіз."],
gx009:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx010:["✓ · Составьте одно предложение второго условного типа.","✓ · Екінші шартты сөйлем құрыңыз."],
gx011:["✓ · Напишите вежливый вариант.","✓ · Сыпайы нұсқасын жазыңыз."],
gx012:["✗ · В каждом предложении одно слово лишнее. Нажмите на него.","✗ · Әр сөйлемде бір сөз қате. Соны басыңыз."],
gx013:["✓ · Перепишите предложение в страдательном залоге.","✓ · Сөйлемді ырықсыз етісте қайта жазыңыз."],
gx014:["✓ · Перепишите предложение, используя форму на -ing.","✓ · Сөйлемді -ing формасын қолданып қайта жазыңыз."],
gx015:["Прочитайте и выполните задание.","Оқып, тапсырманы орындаңыз."],
gx016:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
gx017:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
gx018:["Выберите правильный вариант.","Дұрыс нұсқаны таңдаңыз."],
gx019:["Выполните задание.","Тапсырманы орындаңыз."],
gx020:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx021:["Работайте в парах.","Жұпта жұмыс істеңіз."],
gx022:["Работа с преподавателем.","Мұғаліммен жұмыс."],
gx023:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx024:["Прочитайте и выполните задание.","Оқып, тапсырманы орындаңыз."],
gx025:["Выполните задание.","Тапсырманы орындаңыз."],
gx026:["Выполните задание.","Тапсырманы орындаңыз."],
gx027:["Расположите в правильном порядке.","Дұрыс ретпен орналастырыңыз."],
gx028:["1 · Выберите правильную форму.","1 · Дұрыс формасын таңдаңыз."],
gx029:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx030:["3 · В каждом предложении одно слово неверно. Нажмите на него.","3 · Әр сөйлемде бір сөз қате. Соны басыңыз."],
gx031:["Соотнесите части.","Бөліктерді сәйкестендіріңіз."],
gx032:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx033:["✓ · Дайте тот же совет другими словами.","✓ · Дәл сол кеңесті басқаша беріңіз."],
gx034:["Прочитайте и выполните задание.","Оқып, тапсырманы орындаңыз."],
gx035:["Соотнесите части.","Бөліктерді сәйкестендіріңіз."],
gx036:["Выполните задание.","Тапсырманы орындаңыз."],
gx037:["Выберите правильный вариант.","Дұрыс нұсқаны таңдаңыз."],
gx038:["Слушайте и выполните задание.","Тыңдап, тапсырманы орындаңыз."],
gx039:["Слушайте и выполните задание.","Тыңдап, тапсырманы орындаңыз."],
gx040:["Слушайте и выполните задание.","Тыңдап, тапсырманы орындаңыз."],
gx041:["Слушайте и выполните задание.","Тыңдап, тапсырманы орындаңыз."],
gx042:["Работайте в парах.","Жұпта жұмыс істеңіз."],
gx043:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx044:["Работа с преподавателем.","Мұғаліммен жұмыс."],
gx045:["Выполните задание.","Тапсырманы орындаңыз."],
gx046:["Расположите в правильном порядке.","Дұрыс ретпен орналастырыңыз."],
gx047:["Выполните задание.","Тапсырманы орындаңыз."],
gx048:["Выберите правильный вариант.","Дұрыс нұсқаны таңдаңыз."],
gx049:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx050:["Работайте в парах.","Жұпта жұмыс істеңіз."],
gx051:["Работа с преподавателем.","Мұғаліммен жұмыс."],
gx052:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx053:["Прочитайте и выполните задание.","Оқып, тапсырманы орындаңыз."],
gx054:["Выполните задание.","Тапсырманы орындаңыз."],
gx055:["Две половины","Екі бөлік"],
gx056:["Расположите в правильном порядке.","Дұрыс ретпен орналастырыңыз."],
gx057:["Слушайте и выполните задание.","Тыңдап, тапсырманы орындаңыз."],
gx058:["Выполните задание.","Тапсырманы орындаңыз."],
gx059:["Соотнесите части.","Бөліктерді сәйкестендіріңіз."],
gx060:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx061:["✓ · Соедините две мысли словом времени из скобок.","✓ · Екі ойды жақшадағы уақыт сөзімен біріктіріңіз."],
gx062:["Слушайте и выполните задание.","Тыңдап, тапсырманы орындаңыз."],
gx063:["Слушайте и выполните задание.","Тыңдап, тапсырманы орындаңыз."],
gx064:["Слушайте и выполните задание.","Тыңдап, тапсырманы орындаңыз."],
gx065:["Слушайте и выполните задание.","Тыңдап, тапсырманы орындаңыз."],
gx066:["Выполните задание.","Тапсырманы орындаңыз."],
gx067:["Работайте в парах.","Жұпта жұмыс істеңіз."],
gx068:["Выполните задание.","Тапсырманы орындаңыз."],
gx069:["Работа с преподавателем.","Мұғаліммен жұмыс."],
gx070:["Работа с преподавателем.","Мұғаліммен жұмыс."],
gx071:["1 · Закончите каждое предложение так, чтобы это было правдой о вас.","1 · Әр сөйлемді өзіңізге сай болатындай аяқтаңыз."],
gx072:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx073:["Выполните задание.","Тапсырманы орындаңыз."],
gx074:["Выполните задание.","Тапсырманы орындаңыз."],
gx075:["Выберите правильный вариант.","Дұрыс нұсқаны таңдаңыз."],
gx076:["Выполните задание.","Тапсырманы орындаңыз."],
gx077:["Работайте в парах.","Жұпта жұмыс істеңіз."],
gx078:["Работа с преподавателем.","Мұғаліммен жұмыс."],
gx079:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx080:["Прочитайте и выполните задание.","Оқып, тапсырманы орындаңыз."],
gx081:["Выполните задание.","Тапсырманы орындаңыз."],
gx082:["Выполните задание.","Тапсырманы орындаңыз."],
gx083:["Выполните задание.","Тапсырманы орындаңыз."],
gx084:["Соотнесите части.","Бөліктерді сәйкестендіріңіз."],
gx085:["Выберите правильный вариант.","Дұрыс нұсқаны таңдаңыз."],
gx086:["✓ · Составьте одно предложение первого условного типа.","✓ · Бірінші шартты сөйлем құрыңыз."],
gx087:["Прочитайте и выполните задание.","Оқып, тапсырманы орындаңыз."],
gx088:["Прочитайте и выполните задание.","Оқып, тапсырманы орындаңыз."],
gx089:["Прочитайте и выполните задание.","Оқып, тапсырманы орындаңыз."],
gx090:["Выполните задание.","Тапсырманы орындаңыз."],
gx091:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx092:["Работайте в парах.","Жұпта жұмыс істеңіз."],
gx093:["Прочитайте и выполните задание.","Оқып, тапсырманы орындаңыз."],
gx094:["Работа с преподавателем.","Мұғаліммен жұмыс."],
gx095:["Работа с преподавателем.","Мұғаліммен жұмыс."],
gx096:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx097:["✓ · Напишите вежливый вопрос.","✓ · Сыпайы сұрақ жазыңыз."],
gx098:["✓ · Перепишите предложение так, чтобы смысл не изменился.","✓ · Мағынасы өзгермейтіндей етіп сөйлемді қайта жазыңыз."],
gx099:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx100:["Прочитайте и выполните задание.","Оқып, тапсырманы орындаңыз."],
gx101:["✓ · Перепишите предложение в нужном прошедшем времени.","✓ · Сөйлемді қажетті өткен шақта қайта жазыңыз."],
gx102:["✎ · Заполните пропуски в тексте. Поставьте глагол в нужную форму.","✎ · Мәтіндегі бос орындарды толтырыңыз. Етістікті қажетті формаға қойыңыз."],
gx103:["✓ · Перепишите предложение в сравнительной или превосходной степени.","✓ · Сөйлемді салыстырмалы немесе күшейтпелі шырайда қайта жазыңыз."],
gx104:["✓ · Вы забыли слово. Перепишите предложение так, чтобы оно всё равно работало.","✓ · Сөзді ұмыттыңыз. Сөйлемді бәрібір түсінікті болатындай қайта жазыңыз."],
gx105:["✎ · Заполните пропуски в тексте. Поставьте глагол в нужную форму.","✎ · Мәтіндегі бос орындарды толтырыңыз. Етістікті қажетті формаға қойыңыз."],
gx106:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx107:["✎ · Заполните пропуски в тексте. Поставьте глагол в нужную форму.","✎ · Мәтіндегі бос орындарды толтырыңыз. Етістікті қажетті формаға қойыңыз."],
gx108:["✓ · Перепишите реплику так, чтобы она звучала как рассказ или реакция.","✓ · Жолды әңгіме немесе реакция сияқты естілетіндей қайта жазыңыз."],
gx109:["✎ · Заполните пропуски в тексте. Поставьте глагол в нужную форму.","✎ · Мәтіндегі бос орындарды толтырыңыз. Етістікті қажетті формаға қойыңыз."],
gx110:["Обсудите это с партнёром. Две-три минуты.","Мұны серіктесіңізбен талқылаңыз. Екі-үш минут."],
gx111:["Ответьте на эти два вопроса вслух, затем письменно в двух-трёх предложениях.","Осы екі сұраққа дауыстап, содан кейін екі-үш сөйлеммен жауап беріңіз."],
gx112:["Заполните пропуски.","Бос орындарды толтырыңыз."],
gx113:["✎ · Заполните пропуски в тексте. Поставьте глагол в нужную форму.","✎ · Мәтіндегі бос орындарды толтырыңыз. Етістікті қажетті формаға қойыңыз."],
gx114:["✓ · Перепишите предложение в Past Simple.","✓ · Сөйлемді Past Simple шағында қайта жазыңыз."],
gx115:["✎ · Заполните пропуски в тексте. Поставьте глагол в нужную форму.","✎ · Мәтіндегі бос орындарды толтырыңыз. Етістікті қажетті формаға қойыңыз."],
gx116:["✓ · Запишите указание в повелительном наклонении.","✓ · Нұсқауды бұйрық райда жазыңыз."],
gx117:["Выполните задание.","Тапсырманы орындаңыз."],
gx118:["✓ · Перепишите предложение в другом настоящем времени.","✓ · Сөйлемді басқа осы шақта қайта жазыңыз."],
gx119:["✓ · Перепишите предложение со словом в скобках.","✓ · Жақшадағы сөзбен сөйлемді қайта жазыңыз."],
gx120:["✓ · Напишите вопрос. Ответ подчёркнут.","✓ · Сұрақ жазыңыз. Жауап асты сызылған."],
gx121:["Обсудите это с партнёром. Две-три минуты.","Мұны серіктесіңізбен талқылаңыз. Екі-үш минут."],
gx122:["Ответьте на эти два вопроса вслух, затем письменно в двух-трёх предложениях.","Осы екі сұраққа дауыстап, содан кейін екі-үш сөйлеммен жауап беріңіз."],
/* ---- Units 11-12 ---- */
e101:["Прочитайте каждое утверждение. Согласны или не согласны?","Әр пікірді оқыңыз. Келісесіз бе, келіспейсіз бе?"],
e102:["Определитесь по каждому, затем напишите одну строку о том, где ваша позиция сильнее всего.","Әрқайсысы бойынша шешіп, ең сенімді позицияңыз туралы бір жол жазыңыз."],
e103:["Определитесь по каждому, затем скажите преподавателю, где ваша позиция сильнее всего.","Әрқайсысы бойынша шешіп, оқытушыға айтыңыз."],
e104:["Определитесь по каждому, затем найдите того, кто не согласился с вами хотя бы в одном.","Әрқайсысы бойынша шешіп, кемінде біреуінде сізбен келіспеген адамды табыңыз."],
e105:["Правильного ответа здесь нет. Несогласие — это и есть задание.","Мұнда дұрыс жауап жоқ. Келіспеу — тапсырманың мәні."],
e106:["Запишите","Жазып алыңыз"],
e107:["Обсудите","Талқылаңыз"],
e201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
e202:["Показать перевод","Аудармасын көрсету"],
e203:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
e205:["3 · Какое слово подходит? Сначала прочитайте предложение целиком.","3 · Қай сөз келеді? Алдымен сөйлемді толық оқыңыз."],
e207:["4 · Какое прилагательное сочетается с каждым словом?","4 · Қай сын есім әрқайсысымен тіркеседі?"],
e209:["5 · Какое слово лишнее? Выберите одно в каждой строке.","5 · Қай сөз артық? Әр жолда біреуін таңдаңыз."],
e210:["Три из них — стихийные бедствия, одно — нет.","Үшеуі — табиғи апат, біреуі — жоқ."],
e213:["6 · Работа в парах. Проверьте друг друга по словам.","6 · Жұпта жұмыс. Бір-біріңізді тексеріңіз."],
e214:["Студент A читает значение с карточки A. Студент B называет слово, не подглядывая. Затем поменяйтесь.","A студенті мағынаны оқиды, B студенті сөзді айтады. Содан кейін ауысыңыз."],
e215:["По пять каждому. Если партнёр застрял, подскажите первый звук, а не ответ.","Әрқайсысына бестен. Әріптесіңіз тұрып қалса, бірінші дыбысты айтыңыз."],
e216:["6 · Преподаватель читает значение. Назовите слово, не подглядывая.","6 · Оқытушы мағынасын оқиды. Қарамай сөзді айтыңыз."],
e217:["Десять значений, затем поменяйтесь: вы читаете, преподаватель отвечает.","Он мағына, содан кейін ауысыңыз."],
e301:["Прочитайте эти четыре предложения из записи.","Жазбадағы осы төрт сөйлемді оқыңыз."],
e302:["Глагол после if стоит в прошедшем времени. Говорящий говорит о прошлом?","if-тен кейінгі етістік өткен шақта тұр. Сөйлеуші өткен туралы айтып тұр ма?"],
e303:["Схема","Үлгі"],
e310:["ФОРМА. if + Past Simple, would + начальная форма глагола. Половины можно менять местами.","ФОРМАСЫ. if + Past Simple, would + етістіктің бастапқы формасы."],
e311:["УПОТРЕБЛЕНИЕ. Ситуация неверна сейчас или крайне маловероятна. Прошедшая форма — сигнал «представь», а не прошедшее время.","ҚОЛДАНЫЛУЫ. Жағдай қазір шындыққа сай емес немесе екіталай."],
e312:["BE. If I were you… — were для всех лиц.","BE. If I were you… — барлық жақ үшін were."],
e313:["Нельзя: «If I would have money», «If I will be rich», «If I had money, I will buy…»","Былай болмайды: «If I would have money», «If I will be rich»."],
e314:["Сравните с первым условным из юнита 9: If it rains, I'll stay in — то возможно. Это — нет.","9-бөлімдегі бірінші шартты сөйлеммен салыстырыңыз."],
e320:["ФОРМА. if + Past Simple и would + начальная форма глагола. If I had more time, I would learn to dance. Можно перевернуть — смысл не изменится. Если половина с if идёт первой, после неё запятая; если второй — запятой нет.","ФОРМАСЫ. if + Past Simple және would + етістіктің бастапқы формасы. Жартыларын ауыстыруға болады."],
e321:["УПОТРЕБЛЕНИЕ. Это «время воображения». Прошедшая форма здесь НЕ означает прошедшее время — это способ грамматики сказать «на самом деле это не так». If I had more time значит, что времени у меня нет. If I were you значит, что я не вы.","ҚОЛДАНЫЛУЫ. Бұл — «елестету» шағы. Өткен форма өткен уақытты білдірмейді."],
e322:["СРАВНЕНИЕ. If it rains tomorrow, I'll stay in — дождь вполне возможен, значит первый условный. If it snowed in July, I'd be amazed — этого не будет, значит второй. Выбор зависит не от времени, а от того, насколько вы считаете это вероятным.","САЛЫСТЫРУ. Таңдау уақытқа емес, ықтималдыққа байланысты."],
e323:["WERE, А НЕ WAS. С глаголом be аккуратный английский использует were для всех лиц: If he were here…, If I were you… В речи вы услышите was, и никто не возразит, но на письме пишите were.","WERE, WAS ЕМЕС. be етістігімен барлық жақта were қолданылады."],
e324:["МЯГЧЕ. Замените would на could или might, если вы менее уверены: If we planted more trees, it might help.","ЖҰМСАҚТАУ. Сенімсіз болсаңыз, would орнына could немесе might қойыңыз."],
e325:["Три ошибки: «If I would have money» (никогда would в половине с if) · «If I will be rich» (будущего в половине с if тоже нет) · «If I had money, I will buy a house» (смешение двух условных).","Үш қате: if жартысында would да, will де болмайды; екі шартты сөйлемді араластыру."],
e401:["1 · Выберите подходящую форму.","1 · Сәйкес форманы таңдаңыз."],
e403:["2 · Поставьте глагол в правильную форму.","2 · Етістікті дұрыс формаға қойыңыз."],
e404:["В одной половине нужен Past Simple, в другой — would + глагол.","Бір жартысында Past Simple, екіншісінде would + етістік керек."],
e405:["3 · В каждом предложении одно слово неверное. Нажмите на него.","3 · Әр сөйлемде бір сөз қате. Оны басыңыз."],
e407:["4 · Первое предложение — правда. Напишите воображаемый вариант.","4 · Бірінші сөйлем — шындық. Елестетілген нұсқасын жазыңыз."],
e409:["5 · Теперь пассив. Поставьте глагол так, чтобы предложение говорило, что делается или было сделано.","5 · Енді ырықсыз етіс. Етістікті сәйкес формаға қойыңыз."],
e410:["Форма из юнита 10, тема этого урока.","10-бөлімнің формасы, осы сабақтың тақырыбы."],
e411:["6 · Расставьте слова по порядку. Нажимайте по одному.","6 · Сөздерді ретімен қойыңыз."],
e501:["Прочитайте один раз и ответьте. Верно или неверно?","Бір рет оқып, жауап беріңіз. Дұрыс па, бұрыс па?"],
e601:["Прежде чем слушать: у трёх человек по минуте, чтобы описать идею, которая сделает мир лучше. Каких идей вы ожидаете?","Тыңдамас бұрын: үш адамның әрқайсысында бір минуттан. Қандай идея күтесіз?"],
e602:["Правильного ответа нет. Сначала решите, потом послушайте и проверьте.","Дұрыс жауап жоқ. Алдымен шешіп, содан кейін тыңдаңыз."],
e603:["1 · Послушайте один раз. Чья это идея?","1 · Бір рет тыңдаңыз. Бұл кімнің идеясы?"],
e604:["2 · Послушайте ещё раз и дополните. Кнопки выше дают по одному говорящему.","2 · Қайта тыңдап толықтырыңыз. Жоғарыдағы түймелер бір сөйлеушіні береді."],
e605:["3 · Какие предложения из записи — второй условный? Отметьте все.","3 · Жазбадағы қай сөйлемдер екінші шартты сөйлем? Барлығын белгілеңіз."],
e606:["Три из шести. Ищите обе половины: if + прошедшая форма и would + глагол.","Алтауының үшеуі. Екі жартысын да іздеңіз."],
e607:["Запишите","Жазып алыңыз"],
e608:["Обсудите","Талқылаңыз"],
e609:["Работа в парах. По две минуты каждому, затем смените партнёра.","Жұпта жұмыс. Әрқайсысына екі минуттан."],
e610:["Обсудите","Талқылаңыз"],
e611:["Ответьте, затем задайте те же три вопроса преподавателю.","Жауап беріп, сол үш сұрақты оқытушыға қойыңыз."],
e701:["Полезные фразы","Пайдалы сөз тіркестері"],
e702:["1 · Две минуты на подготовку собственной идеи на шестьдесят секунд.","1 · Өз идеяңызды дайындауға екі минут."],
e703:["Используйте минимум два вторых условных. Только тезисы — говорить, а не читать.","Кемінде екі шартты сөйлем қолданыңыз. Тек тезис — оқымай сөйлейсіз."],
e704:["Скажите, в чём идея, затем почему она сработает, затем что изменится, если так сделают все.","Идея не, неге жұмыс істейді, бәрі солай істесе не өзгереді."],
e705:["2 · Работа в тройках. Двое выступают, один судит. Затем меняйтесь.","2 · Үштікте жұмыс. Екеуі сөйлейді, біреуі бағалайды. Содан кейін ауысыңыз."],
e706:["Меняйтесь, пока каждый не выступит и не побудет судьёй. Судейство — это то место, где грамматика возвращается.","Әркім сөйлеп, бағалап шыққанша ауысыңыз."],
e707:["Обратная связь","Кері байланыс"],
e708:["1 · Две минуты на подготовку собственной идеи на шестьдесят секунд.","1 · Өз идеяңызды дайындауға екі минут."],
e709:["Используйте минимум два вторых условных. Только тезисы — говорить, а не читать.","Кемінде екі шартты сөйлем қолданыңыз."],
e710:["Скажите, в чём идея, затем почему она сработает, затем что изменится, если так сделают все.","Идея не, неге жұмыс істейді, не өзгереді."],
e711:["2 · Вы выступаете, преподаватель судит. Затем поменяйтесь.","2 · Сіз сөйлейсіз, оқытушы бағалайды. Содан кейін ауысыңыз."],
e712:["Обмен ролями важен. Судейство — это то место, где грамматику приходится выдавать под давлением.","Рөл алмасу маңызды."],
e713:["Обратная связь","Кері байланыс"],
e714:["1 · Напишите свою идею на шестьдесят секунд. Шесть-восемь предложений.","1 · Алпыс секундтық идеяңызды жазыңыз. Алты-сегіз сөйлем."],
e715:["Используйте «If…, … would…» минимум дважды и закончите тем, каким стал бы мир, если бы так сделали все.","«If…, … would…» кемінде екі рет қолданыңыз."],
e716:["2 · Теперь скажите это вслух за шестьдесят секунд.","2 · Енді мұны алпыс секундта дауыстап айтыңыз."],
e717:["Засеките время. Запишите себя, если можете. Затем повторите, не глядя на страницу — второй прогон всегда чище и быстрее.","Уақытты өлшеңіз. Содан кейін бетке қарамай қайталаңыз."],
e801:["Отметьте всё, что вы уже умеете.","Істей алатыныңыздың бәрін белгілеңіз."],
e802:["Преподавателю","Оқытушыға"],
f101:["Чем из этого вы пользовались в детстве? Отметьте всё подходящее.","Балалық шағыңызда бұлардың қайсысын қолдандыңыз? Барлығын белгілеңіз."],
f102:["Отметьте, затем напишите одну строку о том, чего вам не хватает больше всего.","Белгілеп, ең сағынатыныңыз туралы бір жол жазыңыз."],
f103:["Отметьте, затем скажите преподавателю, чего вам не хватает больше всего.","Белгілеп, оқытушыға айтыңыз."],
f104:["Отметьте, затем найдите того, кто отметил что-то, чего не отметили вы.","Белгілеп, сіз белгілемегенді белгілеген адамды табыңыз."],
f105:["Правильного ответа нет. Обратите внимание, скольких из них вы не касались годами.","Дұрыс жауап жоқ. Қаншасын жылдар бойы ұстамағаныңызға назар аударыңыз."],
f106:["Запишите","Жазып алыңыз"],
f107:["Обсудите","Талқылаңыз"],
f201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
f202:["Показать перевод","Аудармасын көрсету"],
f203:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
f205:["3 · Какое слово подходит? Сначала прочитайте предложение целиком.","3 · Қай сөз келеді? Алдымен сөйлемді толық оқыңыз."],
f207:["4 · Дополните каждое предложение фразовым глаголом.","4 · Әр сөйлемді фразалық етістікпен толықтырыңыз."],
f208:["узнать · вырасти · основать · продолжать · бросить · надеть","білу · өсу · құру · жалғастыру · тастау · кию"],
f209:["5 · Какое слово лишнее? Выберите одно в каждой строке.","5 · Қай сөз артық? Әр жолда біреуін таңдаңыз."],
f210:["Три происходят без участия людей; одно — нет.","Үшеуі адамсыз болады, біреуі — жоқ."],
f213:["6 · Работа в парах. Проверьте друг друга по словам.","6 · Жұпта жұмыс. Бір-біріңізді тексеріңіз."],
f214:["Студент A читает значение с карточки A. Студент B называет слово, не подглядывая. Затем поменяйтесь.","A студенті мағынаны оқиды, B студенті сөзді айтады. Содан кейін ауысыңыз."],
f215:["По пять каждому. Если партнёр застрял, подскажите первый звук, а не ответ.","Әрқайсысына бестен. Тұрып қалса, бірінші дыбысты айтыңыз."],
f216:["6 · Преподаватель читает значение. Назовите слово, не подглядывая.","6 · Оқытушы мағынасын оқиды. Қарамай сөзді айтыңыз."],
f217:["Десять значений, затем поменяйтесь: вы читаете, преподаватель отвечает.","Он мағына, содан кейін ауысыңыз."],
f301:["Прочитайте эти четыре предложения из текста.","Мәтіндегі осы төрт сөйлемді оқыңыз."],
f302:["Во всех четырёх предложениях — что used to говорит вам о настоящем?","Төрт сөйлемде де used to қазіргі уақыт туралы не айтады?"],
f303:["Три формы","Үш форма"],
f304:["used to или Past Simple?","used to ма, әлде Past Simple пе?"],
f310:["ФОРМА. used to + начальная форма глагола. Одинаково для всех лиц.","ФОРМАСЫ. used to + етістіктің бастапқы формасы. Барлық жақ үшін бірдей."],
f311:["УПОТРЕБЛЕНИЕ. Прошлая привычка или прошлое состояние, которое БОЛЬШЕ НЕ ВЕРНО. Вторая половина — самое главное.","ҚОЛДАНЫЛУЫ. Бұрынғы әдет немесе жағдай, ол ЕНДІ ОЛАЙ ЕМЕС."],
f312:["БУКВА D. После did буква d исчезает: didn't use to, Did you use to…?","D ӘРПІ. did-тен кейін d жоғалады: didn't use to, Did you use to…?"],
f313:["Нельзя: «I used to went», «I didn't used to», «Did you used to», «I use to live here» про настоящее.","Былай болмайды: «I used to went», «I didn't used to», «Did you used to»."],
f314:["В юните 11 нет записи с этой формой. Прочитайте четыре примера вслух сами, дважды.","11-бөлімде бұл форманың жазбасы жоқ. Төрт мысалды өзіңіз дауыстап екі рет оқыңыз."],
f320:["ФОРМА. used to + начальная форма глагола: I used to read, she used to live, they used to be. Одинаково для всех лиц — формы he uses to не существует.","ФОРМАСЫ. used to + етістіктің бастапқы формасы. Барлық жақ үшін бірдей."],
f321:["УПОТРЕБЛЕНИЕ. Отмечает то, что было привычкой или положением дел в прошлом и СЕЙЧАС НЕ ТАК. «I used to smoke» говорит сразу две вещи: тогда я курил и сегодня не курю. Если это всё ещё верно, эта форма не годится — скажите «I still smoke» или «I usually…».","ҚОЛДАНЫЛУЫ. Бұрын солай болған, қазір олай емес."],
f322:["ПРОПАВШАЯ D. В отрицании и вопросе did уже несёт прошедшее время, поэтому d отпадает: I didn't use to like coffee. Did you use to walk to school? В речи used to и use to звучат одинаково — именно поэтому написание и подводит.","ЖОҒАЛҒАН D. Болымсыз бен сұрақта did өткен шақты білдіреді, сондықтан d түсіп қалады."],
f323:["ПРОТИВ PAST SIMPLE. Оба варианта — правильный английский, разница в смысле, а не в грамматике. «I used to live in Almaty» — период закончился, дат нет. «I lived in Almaty for three years» — вы считаете время, значит Past Simple. Если называете один конкретный случай («I moved there in 2016»), used to невозможно: это не привычка.","PAST SIMPLE-ГЕ ҚАРСЫ. Екеуі де дұрыс, айырмашылық мағынада."],
f324:["Четыре ошибки: «I used to went» (глагол остаётся в начальной форме) · «I didn't used to» (убрать d) · «Did you used to?» (здесь тоже убрать) · «I use to live here» про настоящее (настоящей формы не существует).","Төрт қате: етістік бастапқы формада қалады; d түсіп қалады; осы шақ формасы жоқ."],
f325:["Ещё одно на заметку. С состояниями — be, have, know, like — работает только used to: I used to have long hair. Вам может встретиться would в том же значении для повторяющихся действий (we would walk home together), но никогда для состояний.","Тағы бір нәрсе. Күй етістіктерімен тек used to жүреді."],
f401:["1 · Выберите подходящую форму.","1 · Сәйкес форманы таңдаңыз."],
f403:["2 · Напишите предложение с used to.","2 · used to-мен сөйлем жазыңыз."],
f405:["3 · В каждом предложении одно слово неверное. Нажмите на него.","3 · Әр сөйлемде бір сөз қате. Оны басыңыз."],
f407:["4 · used to или Past Simple? Решает только смысл.","4 · used to ма, Past Simple пе? Тек мағына шешеді."],
f408:["Если предложение считает время или называет один конкретный случай — побеждает Past Simple.","Егер сөйлем уақытты санаса немесе бір оқиғаны атаса — Past Simple жеңеді."],
f409:["5 · Теперь второй условный. Дополните каждое воображаемое предложение.","5 · Енді екінші шартты сөйлем. Әрқайсысын толықтырыңыз."],
f410:["Форма прошлого урока, тема этого.","Өткен сабақтың формасы, осы сабақтың тақырыбы."],
f411:["6 · Расставьте слова по порядку. Нажимайте по одному.","6 · Сөздерді ретімен қойыңыз."],
f501:["Прежде чем читать: двести лет назад сколько времени новость шла из одного города в соседний?","Оқымас бұрын: екі жүз жыл бұрын жаңалық көрші қалаға қанша уақытта жететін?"],
f502:["Сначала решите. Ответ — в первом абзаце.","Алдымен шешіңіз. Жауап бірінші абзацта."],
f505:["1 · Прочитайте один раз. Подберите заголовок к каждому абзацу.","1 · Бір рет оқыңыз. Әр абзацқа тақырып таңдаңыз."],
f507:["2 · Прочитайте ещё раз. Верно или неверно?","2 · Қайта оқыңыз. Дұрыс па, бұрыс па?"],
f509:["3 · Найдите в тексте слово, которое означает…","3 · Мәтіннен мына мағынадағы сөзді табыңыз…"],
f511:["4 · Какие из них есть в тексте в форме used to + глагол? Отметьте все.","4 · Мәтінде қайсысы used to + етістік түрінде кездеседі?"],
f512:["Три из шести. Остальные — Past Simple или настоящее время.","Алтауының үшеуі. Қалғандары — Past Simple немесе осы шақ."],
f513:["Запишите","Жазып алыңыз"],
f514:["Обсудите","Талқылаңыз"],
f515:["Работа в парах. По две минуты каждому, затем смените партнёра.","Жұпта жұмыс. Әрқайсысына екі минуттан."],
f516:["Обсудите","Талқылаңыз"],
f517:["Ответьте, затем задайте те же три вопроса преподавателю.","Жауап беріп, сол үш сұрақты оқытушыға қойыңыз."],
f601:["Послушайте и заполните заметки.","Тыңдап, жазбаларды толтырыңыз."],
f602:["Нажмите на любую из двух новостей, чтобы прослушать её снова.","Кез келген жаңалықты қайта тыңдау үшін басыңыз."],
f603:["Четыре слова этого урока звучат в этих сорока секундах: forest fire, natural disaster, flood и report. Из этого и состоит выпуск новостей.","Осы қырық секундта осы сабақтың төрт сөзі бар."],
f701:["Полезные фразы","Пайдалы сөз тіркестері"],
f702:["1 · Работа в парах. Студент A берёт карточку A, студент B — карточку B.","1 · Жұпта жұмыс. A студенті A картасын, B студенті B картасын алады."],
f703:["Студент B сегодня — этот человек. Отвечайте в роли и оставайтесь в ней.","B студенті бүгін — осы адам. Рөлде жауап беріп, рөлде қалыңыз."],
f704:["Проведите один раз, затем поменяйтесь ролями и проведите ещё раз с придуманным вами человеком. Второй прогон и есть главный.","Бір рет өткізіп, рөлдерді ауыстырып қайталаңыз."],
f705:["2 · Теперь без ролей. Расспросите партнёра о его собственном детстве.","2 · Енді рөлсіз. Әріптесіңіздің балалық шағы туралы сұраңыз."],
f706:["Вы ходили в школу пешком? · смотрели мультики? · писали письма? · играли на улице? · Что ваша семья делала по воскресеньям?","Мектепке жаяу бардыңыз ба? · мультфильм көрдіңіз бе? · хат жаздыңыз ба?"],
f707:["Обратная связь","Кері байланыс"],
f708:["1 · Вы — интервьюер. Преподаватель берёт карточку B.","1 · Сіз — сұхбат алушысыз. Оқытушы B картасын алады."],
f709:["Преподаватель сегодня — этот человек и останется в роли.","Оқытушы бүгін — осы адам және рөлде қалады."],
f710:["Проведите один раз, затем поменяйтесь — преподаватель расспросит вас о вашем детстве.","Бір рет өткізіп, ауысыңыз."],
f711:["2 · Теперь без ролей — поговорите о вашем настоящем детстве.","2 · Енді рөлсіз — нақты балалық шағыңыз туралы сөйлесіңіз."],
f712:["Вы ходили в школу пешком? · смотрели мультики? · писали письма? · Что ваша семья делала по воскресеньям?","Мектепке жаяу бардыңыз ба? · хат жаздыңыз ба?"],
f713:["Обратная связь","Кері байланыс"],
f714:["1 · Напишите восемь предложений о том, как раньше была устроена ваша жизнь.","1 · Бұрын өміріңіз қалай болғаны туралы сегіз сөйлем жазыңыз."],
f715:["Четыре утвердительных, два отрицательных с didn't use to и два с There used to be… Каждое предложение должно описывать то, что изменилось.","Төртеуі болымды, екеуі didn't use to-мен, екеуі There used to be…"],
f716:["2 · Теперь скажите это вслух. Говорите минуту без остановки.","2 · Енді дауыстап айтыңыз. Бір минут тоқтамай сөйлеңіз."],
f717:["Запишите себя, если можете. Прослушайте и проверьте одно: вы сказали didn't use to — или d всё-таки вернулась? Затем скажите ещё раз, быстрее.","Өзіңізді жазып алыңыз. Бір нәрсені тексеріңіз: d қайта оралды ма?"],
f801:["Отметьте всё, что вы уже умеете.","Істей алатыныңыздың бәрін белгілеңіз."],
f802:["Преподавателю","Оқытушыға"],
h101:["Выберите одно утверждение, по которому у вас самое сильное мнение — за или против.","Пікіріңіз ең күшті бір тұжырымды таңдаңыз."],
h102:["Выберите одно, затем напишите две строки: что вы думаете и почему.","Біреуін таңдап, не ойлайтыныңызды және неге екенін екі жолмен жазыңыз."],
h103:["Выберите одно, затем скажите преподавателю, что вы думаете и почему.","Біреуін таңдап, оқытушыға айтыңыз."],
h104:["Выберите одно, затем найдите того, кто выбрал то же утверждение, и проверьте, на одной ли вы стороне.","Біреуін таңдап, сол тұжырымды таңдаған адамды табыңыз."],
h105:["Только одно. Правильного ответа нет — и защищать его пока не придётся.","Тек біреуі. Дұрыс жауап жоқ."],
h106:["Запишите","Жазып алыңыз"],
h107:["Обсудите","Талқылаңыз"],
h201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
h202:["Показать перевод","Аудармасын көрсету"],
h203:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
h205:["3 · Какое слово подходит? Эти пары легко перепутать.","3 · Қай сөз келеді? Бұл жұптарды шатастыру оңай."],
h207:["4 · Какое слово сочетается с каждым?","4 · Қай сөз әрқайсысымен тіркеседі?"],
h209:["5 · Какое слово лишнее? Выберите одно в каждой строке.","5 · Қай сөз артық? Әр жолда біреуін таңдаңыз."],
h210:["Три из них — люди; одно — нет.","Үшеуі — адам, біреуі — жоқ."],
h213:["6 · Работа в парах. Проверьте друг друга по словам.","6 · Жұпта жұмыс. Бір-біріңізді тексеріңіз."],
h214:["Студент A читает значение с карточки A. Студент B называет слово, не подглядывая. Затем поменяйтесь.","A студенті мағынаны оқиды, B студенті сөзді айтады."],
h215:["По пять каждому. Если партнёр застрял, подскажите первый звук, а не ответ.","Әрқайсысына бестен. Тұрып қалса, бірінші дыбысты айтыңыз."],
h216:["6 · Преподаватель читает значение. Назовите слово, не подглядывая.","6 · Оқытушы мағынасын оқиды. Қарамай сөзді айтыңыз."],
h217:["Десять значений, затем поменяйтесь: вы читаете, преподаватель отвечает.","Он мағына, содан кейін ауысыңыз."],
h301:["Прочитайте эти четыре ответа из записи.","Жазбадағы осы төрт жауапты оқыңыз."],
h302:["Все четыре не соглашаются. Что трое из них делают ПЕРЕД тем, как возразить?","Төртеуі де келіспейді. Үшеуі қарсылық білдірер АЛДЫНДА не істейді?"],
h303:["Что говорить и когда","Не айту керек және қашан"],
h310:["ПРИЁМ. Сначала уступите немного, потом поверните: «I take your point, but…»","ТӘСІЛ. Алдымен аздап келісіңіз, содан кейін бұрылыңыз."],
h311:["СМЯГЧИТЕЛИ. «I'm afraid», «I'm not sure», «not really» — всё это значит «нет» без самого слова «нет».","ЖҰМСАРТҚЫШТАР. Бұлардың бәрі «жоқ» дегенді білдіреді."],
h312:["ИНТОНАЦИЯ. Голос падает на but и снова поднимается после него. Включите слайдер и скопируйте.","ИНТОНАЦИЯ. Дауыс but-та төмендеп, одан кейін қайта көтеріледі."],
h313:["Нельзя: «You are wrong», «No, that is not true», а также голое «I disagree» без ничего перед ним.","Былай болмайды: «You are wrong», «No, that is not true», жалаң «I disagree»."],
h314:["Это последний новый языковой материал юнита. Всё остальное сегодня — повторение.","Бұл — бөлімдегі соңғы жаңа тілдік материал."],
h320:["ПРИЁМ. Английское несогласие почти всегда состоит из двух частей. Сначала вы что-то отдаёте собеседнику — «True…», «Yeah…», «I take your point…», «That's a good point…» — и только потом поворачиваете через but. Пропустить первую часть — не грамматическая ошибка, но звучит куда жёстче, чем вы хотели.","ТӘСІЛ. Ағылшын тіліндегі келіспеушілік әрқашан екі бөліктен тұрады."],
h321:["СМЯГЧИТЕЛИ. «I'm afraid I disagree» — это не извинение; «I'm afraid» просто сигналит, что дальше будет неприятное. «I'm not sure about that» и «I don't really agree» делают то же самое. Все три значат «нет», вежливо, и носители слышат их как ясное несогласие.","ЖҰМСАРТҚЫШТАР. «I'm afraid» — кешірім емес, алда жағымсыз нәрсе бар деген белгі."],
h322:["ГРАДУСЫ. Здесь есть шкала: I completely agree → You've got a point → I take your point, but → I'm not sure about that → I'm afraid I disagree. Выбирайте своё место на ней осознанно; этот выбор работает сильнее, чем любое отдельное слово.","ДӘРЕЖЕЛЕР. Мұнда шкала бар. Ондағы орныңызды саналы түрде таңдаңыз."],
h323:["ИНТОНАЦИЯ. Послушайте четыре записанных ответа в слайдере. Голос ступенькой идёт вниз на but и затем поднимается. Если сказать слова ровно, вежливость исчезает — мелодия несёт не меньше смысла, чем сама фраза.","ИНТОНАЦИЯ. Слайдердегі төрт жауапты тыңдаңыз. Әуен фразадан кем мағына бермейді."],
h324:["Три вещи, которых стоит избегать: «You are wrong» · «No, that is not true» · голое «I disagree» без ничего перед ним. Все три — правильный английский, и все три остудят разговор быстрее, чем вы ожидаете.","Үш нәрседен аулақ болыңыз. Үшеуі де әңгімені тез суытады."],
h325:["Стоит знать: «I don't have strong views on this» — полноценный и приемлемый ответ. Иметь мнение вы не обязаны.","Білген жөн: «I don't have strong views on this» — толыққанды жауап."],
h330:["Послушайте ещё пять ответов. Каждый — согласие, частичное согласие или несогласие?","Тағы бес жауапты тыңдаңыз. Әрқайсысы қандай?"],
h401:["1 · Что делает каждая фраза?","1 · Әр тіркес не істейді?"],
h403:["2 · Дополните ответы.","2 · Жауаптарды толықтырыңыз."],
h405:["3 · В каждом ответе одно слово неверное. Нажмите на него.","3 · Әр жауапта бір сөз қате. Оны басыңыз."],
h407:["4 · Кто-то говорит: «Modern art is a waste of money». Какой ответ вежливее?","4 · Біреу «Modern art is a waste of money» дейді. Қай жауап сыпайырақ?"],
h408:["Оба варианта — правильный английский. Разница только в впечатлении.","Екеуі де дұрыс ағылшын тілі. Айырмашылық — әсерінде."],
h409:["5 · Весь юнит в одном задании. Выберите подходящую форму.","5 · Бір тапсырмада бүкіл бөлім. Сәйкес форманы таңдаңыз."],
h501:["Вопрос такой: «Некоторые эксперты по СМИ говорят, что приватность в XXI веке умерла. Вы согласны?» Что бы вы ответили?","Сұрақ: «Жеке өмір өлді дейді. Келісесіз бе?» Сіз не жауап берер едіңіз?"],
h502:["Решите до прослушивания. Все четыре ответа звучат в записи.","Тыңдамас бұрын шешіңіз. Төрт жауап та жазбада бар."],
h503:["1 · Послушайте один раз. Что делает каждый человек?","1 · Бір рет тыңдаңыз. Әр адам не істейді?"],
h504:["2 · Послушайте ещё раз и дополните. Кнопки выше дают по одному интервью.","2 · Қайта тыңдап толықтырыңыз."],
h505:["3 · Какие из этих фраз действительно звучат в записи? Отметьте все.","3 · Қай тіркестер жазбада шынымен бар? Барлығын белгілеңіз."],
h506:["Четыре из шести. Двух никто не произносит — и одну из этих двух говорить не стоит никогда.","Алтауының төртеуі. Екеуін ешкім айтпайды."],
h507:["Запишите","Жазып алыңыз"],
h508:["Обсудите","Талқылаңыз"],
h509:["Работа в парах. По две минуты каждому, затем смените партнёра.","Жұпта жұмыс. Әрқайсысына екі минуттан."],
h510:["Обсудите","Талқылаңыз"],
h511:["Ответьте, затем задайте те же три вопроса преподавателю.","Жауап беріп, сол үш сұрақты оқытушыға қойыңыз."],
h601:["1 · Расставьте части выступления по порядку.","1 · Сөйлеу бөліктерін ретімен қойыңыз."],
h603:["2 · Для чего нужна каждая фраза-указатель?","2 · Әр сілтеме тіркесі не үшін керек?"],
h605:["3 · Найдите в выступлении фразу, которая…","3 · Сөйлеуден мына тіркесті табыңыз…"],
h701:["Полезные фразы","Пайдалы сөз тіркестері"],
h702:["1 · Подготовьте двухминутное выступление о том, что вам действительно интересно.","1 · Шынымен қызық нәрсе туралы екі минуттық сөз дайындаңыз."],
h703:["Место, предмет, человек, привычка — что угодно, лишь бы вы могли описать это незнакомцу. Используйте шесть блоков модели и четыре её указателя. Только тезисы — говорить, а не читать.","Модельдің алты блогы мен төрт сілтемесін қолданыңыз. Тек тезис."],
h704:["2 · Работа в тройках. Один выступает, двое слушают и потом задают вопросы.","2 · Үштікте жұмыс. Біреуі сөйлейді, екеуі тыңдап, сұрақ қояды."],
h705:["Меняйтесь, пока каждый не выступит один раз и не задаст вопросы дважды. Именно в вопросах сегодняшний язык и работает.","Әркім бір рет сөйлеп, екі рет сұрақ қойғанша ауысыңыз."],
h706:["Обратная связь","Кері байланыс"],
h707:["2 · Вы выступаете, преподаватель — аудитория. Затем поменяйтесь.","2 · Сіз сөйлейсіз, оқытушы — тыңдаушы. Содан кейін ауысыңыз."],
h708:["Обмен ролями важнее самого выступления. Вежливо возразить под давлением — вот ради чего этот урок.","Рөл алмасу маңыздырақ."],
h709:["Обратная связь","Кері байланыс"],
h710:["2 · Напишите выступление целиком, затем произнесите его за две минуты.","2 · Сөзді толық жазып, екі минутта айтыңыз."],
h711:["Затем закройте страницу и скажите вслух. Запишите себя, если можете. Засеките время — две минуты, не больше.","Содан кейін бетті жауып, дауыстап айтыңыз. Екі минут, артық емес."],
h712:["3 · Теперь ответьте вслух на три неудобных вопроса.","3 · Енді үш қолайсыз сұраққа дауыстап жауап беріңіз."],
h713:["Представьте, что кто-то в зале говорит: «I'm not convinced», «Isn't that a waste of money?» и «Everybody says that». Ответьте на каждый, используя «I take your point, but…», «I'm not sure about that» и «That's a good point, although…»","Залдағы біреу қарсы шықты деп елестетіңіз. Әрқайсысына жауап беріңіз."],
h801:["Отметьте всё, что вы уже умеете.","Істей алатыныңыздың бәрін белгілеңіз."],
h802:["Преподавателю","Оқытушыға"],
m101:["Расставьте эти пять профессий по порядку. В какой из них люди обычно работают дольше всего?","Осы бес кәсіпті ретімен қойыңыз. Адамдар қайсысында әдетте ең ұзақ жұмыс істейді?"],
m102:["Пронумеруйте от 1 (дольше всего) до 5 (меньше всего), затем напишите одну строку — почему на первом месте именно эта.","1-ден (ең ұзақ) 5-ке (ең қысқа) дейін нөмірлеңіз, содан кейін бірінші орынға неге дәл соны қойғаныңызды бір жолмен жазыңыз."],
m103:["Пронумеруйте от 1 (дольше всего) до 5 (меньше всего), затем сравните свой порядок с преподавателем.","1-ден 5-ке дейін нөмірлеп, ретіңізді оқытушымен салыстырыңыз."],
m104:["Пронумеруйте от 1 (дольше всего) до 5 (меньше всего), затем сравните свой порядок с партнёром.","1-ден 5-ке дейін нөмірлеп, ретіңізді әріптесіңізбен салыстырыңыз."],
m105:["Правильного ответа здесь нет. Реальные цифры вы встретите в тексте.","Мұнда дұрыс жауап жоқ. Нақты сандарды мәтіннен кездестіресіз."],
m106:["Запишите","Жазып алыңыз"],
m107:["Обсудите","Талқылаңыз"],
m201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
m202:["Показать перевод","Аудармасын көрсету"],
m203:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
m205:["3 · Какое слово подходит? Эти пары легко перепутать.","3 · Қай сөз келеді? Бұл жұптарды шатастыру оңай."],
m206:["Прочитайте предложение целиком, прежде чем выбирать. Подходит только одно из двух.","Таңдамас бұрын сөйлемді толық оқыңыз. Екеуінің тек біреуі келеді."],
m207:["4 · Человек или место? Выберите одно для каждого слова.","4 · Адам ба, әлде орын ба? Әр сөзге біреуін таңдаңыз."],
m209:["5 · Какое слово лишнее? Выберите одно в каждой строке.","5 · Қай сөз артық? Әр жолда біреуін таңдаңыз."],
m210:["Три из них — люди, одно — нет.","Үшеуі — адам, біреуі — жоқ."],
m213:["6 · Работа в парах. Проверьте друг друга по словам.","6 · Жұпта жұмыс. Бір-біріңізді сөздер бойынша тексеріңіз."],
m214:["Студент A читает значение с карточки A. Студент B называет слово, не подглядывая. Затем поменяйтесь карточками. Отметьте задание выполненным, когда закончите оба.","A студенті A картасынан мағынаны оқиды. B студенті қарамай сөзді айтады. Содан кейін карталарды ауыстырыңыз."],
m215:["По пять слов каждому. Если партнёр не может вспомнить слово, подскажите первый звук, а не ответ.","Әрқайсысына бес сөзден. Егер әріптесіңіз есіне түсіре алмаса, жауапты емес, бірінші дыбысты айтыңыз."],
m216:["6 · Преподаватель читает значение. Назовите слово, не подглядывая.","6 · Оқытушы мағынасын оқиды. Қарамай сөзді айтыңыз."],
m217:["Десять значений. Затем поменяйтесь: вы читаете, преподаватель отвечает.","Он мағына. Содан кейін ауысыңыз: сіз оқисыз, оқытушы жауап береді."],
m301:["Прочитайте эти четыре предложения из урока.","Сабақтағы осы төрт сөйлемді оқыңыз."],
m302:["Посмотрите на слова после for и после since. В чём разница?","for-дан және since-тен кейінгі сөздерге қараңыз. Айырмашылығы неде?"],
m303:["Выбор","Таңдау"],
m304:["Форма","Формасы"],
m310:["ФОРМА. have / has + причастие прошедшего времени.","ФОРМАСЫ. have / has + өткен шақ есімшесі."],
m311:["УПОТРЕБЛЕНИЕ. Началось в прошлом и всё ещё верно сейчас.","ҚОЛДАНЫЛУЫ. Өткенде басталып, әлі күнге дейін жалғасып жатыр."],
m312:["ВЫБОР. for + длительность · since + момент начала.","ТАҢДАУ. for + ұзақтық · since + басталу сәті."],
m313:["Нельзя: «I work here since 2019», «I am working here for five years», «since five years».","Былай болмайды: «I work here since 2019», «I am working here for five years», «since five years»."],
m314:["Это последняя остановка линии Present Perfect, начатой в юните 6.","Бұл 6-бөлімде басталған Present Perfect желісінің соңғы аялдамасы."],
m320:["ФОРМА. have / has + причастие: I've worked · she's worked · we've known · he's been. В речи have почти исчезает — поэтому его так легко не расслышать.","ФОРМАСЫ. have / has + есімше. Сөйлеу тілінде have дерлік жоғалады — сондықтан оны естімей қалу оңай."],
m321:["УПОТРЕБЛЕНИЕ. Действие началось в прошлом и всё ещё верно в этот момент. «I've worked here for five years» значит, что вы и сегодня здесь. «I worked here for five years» значит, что вы ушли.","ҚОЛДАНЫЛУЫ. Әрекет өткенде басталып, дәл қазір де жалғасып жатыр."],
m322:["ВЫБОР. for отвечает на «как долго?» — for two months, for ages. since отвечает на «с какого момента?» — since March, since 2011, since I left school.","ТАҢДАУ. for — «қанша уақыт?», since — «қашаннан бері?»"],
m323:["Три ошибки: «I work here since 2019» (Present Simple вместо Present Perfect) · «I am working here for five years» (Present Continuous) · «since five years» (пять лет — это длительность, нужен for).","Үш қате: «I work here since 2019» · «I am working here for five years» · «since five years»."],
m324:["Ещё одно. «How long have you been here?» спрашивает про сейчас. «How long were you there?» — про работу или место, которое вы уже покинули, и там нужен Past Simple.","Тағы бір нәрсе. «How long have you been here?» қазірді сұрайды, «How long were you there?» — сіз кеткен орынды."],
m330:["Послушайте. В быстрой речи have и has теряют гласный. Что вы слышите?","Тыңдаңыз. Жылдам сөйлеуде have мен has дауыстысын жоғалтады. Қайсысын естисіз?"],
m331:["Две записи, по одному вопросу. Вы слушаете только have или has.","Екі жазба, әрқайсысында бір сұрақ. Тек have не has тыңдайсыз."],
m332:["Полное слово почти никогда не произносят. Ориентируйтесь на лицо перед ним: you требует have, he требует has.","Толық сөз дерлік айтылмайды. Алдындағы жаққа қараңыз: you — have, he — has."],
m401:["1 · Выберите for или since.","1 · for немесе since таңдаңыз."],
m403:["2 · Поставьте глагол в Present Perfect.","2 · Етістікті Present Perfect-ке қойыңыз."],
m404:["Используйте краткую форму, где можно: I've, she's, they've, hasn't.","Мүмкін жерде қысқа форманы қолданыңыз."],
m405:["3 · Напишите второе предложение так, чтобы смысл совпал с первым.","3 · Екінші сөйлемді бірінші сөйлеммен мағынасы бірдей болатындай жазыңыз."],
m407:["4 · В каждом предложении одно слово неверное. Нажмите на него.","4 · Әр сөйлемде бір сөз қате. Оны басыңыз."],
m409:["5 · Present Perfect, Past Simple или used to? Выберите подходящее.","5 · Present Perfect, Past Simple немесе used to? Сәйкесін таңдаңыз."],
m410:["Сначала спросите себя: это всё ещё верно сейчас или уже закончилось?","Алдымен өзіңізден сұраңыз: бұл әлі де солай ма, әлде аяқталды ма?"],
m411:["6 · Расставьте слова так, чтобы получился вопрос. Нажимайте по одному.","6 · Сұрақ шығатындай сөздерді ретімен қойыңыз."],
m501:["Прежде чем читать: сколько в среднем работник в Великобритании держится за одного работодателя?","Оқымас бұрын: Ұлыбританияда орташа қызметкер бір жұмыс берушіде қанша уақыт болады?"],
m502:["Выберите один вариант, затем прочитайте и проверьте себя.","Бір нұсқаны таңдап, оқып тексеріңіз."],
m503:["Угадывать не нужно. Догадка просто заставит вас искать эту цифру в тексте.","Болжау керек емес. Болжам сол санды мәтіннен іздетеді."],
m505:["1 · Прочитайте один раз. Подберите заголовок к каждому абзацу.","1 · Бір рет оқыңыз. Әр абзацқа тақырып таңдаңыз."],
m507:["2 · Прочитайте ещё раз. Верно или неверно?","2 · Қайта оқыңыз. Дұрыс па, бұрыс па?"],
m509:["3 · Найдите в тексте слово, которое означает…","3 · Мәтіннен мына мағынадағы сөзді табыңыз…"],
m511:["4 · Какие предложения из текста говорят, что человек занимается этим до сих пор? Отметьте все.","4 · Мәтіндегі қай сөйлемдер адамның мұны әлі күнге дейін істеп жүргенін көрсетеді?"],
m512:["Три из шести. Смотрите на глагол, а не на смысл.","Алтауының үшеуі. Мағынаға емес, етістікке қараңыз."],
m513:["Запишите","Жазып алыңыз"],
m514:["Обсудите","Талқылаңыз"],
m515:["Работа в парах. По две минуты каждому, затем смените партнёра.","Жұпта жұмыс. Әрқайсысына екі минуттан, содан кейін әріптесті ауыстырыңыз."],
m516:["Обсудите","Талқылаңыз"],
m517:["Ответьте, затем задайте те же три вопроса преподавателю.","Жауап беріңіз, содан кейін сол үш сұрақты оқытушыға қойыңыз."],
m601:["Послушайте и заполните заметки. В каждый пропуск — одно число.","Тыңдап, жазбаларды толтырыңыз. Әр бос орынға бір сан."],
m602:["Нажмите на любую часть, чтобы прослушать её снова. Нужны только части 1, 2 и 3.","Кез келген бөлікті қайта тыңдау үшін басыңыз. Тек 1, 2 және 3-бөліктер керек."],
m603:["Оба числа в пунктах 1 и 2 — это целевая форма: since 2001 говорит, когда началось, for five years — как долго длится.","1 және 2-дегі екі сан да мақсатты форма."],
m701:["Полезные фразы","Пайдалы сөз тіркестері"],
m702:["1 · Работа в парах. Студент A берёт карточку A, студент B — карточку B.","1 · Жұпта жұмыс. A студенті A картасын, B студенті B картасын алады."],
m703:["Сегодня вы — этот человек. Отвечайте на вопросы партнёра в роли. Карточку не показывайте.","Бүгін сіз — осы адамсыз. Рөлде жауап беріңіз. Картаны көрсетпеңіз."],
m704:["Задайте минимум четыре вопроса How long…? Затем поменяйтесь карточками и пройдите ещё раз — второй прогон и есть главный.","Кемінде төрт How long…? сұрағын қойыңыз. Содан кейін карталарды ауыстырып қайталаңыз."],
m705:["2 · Теперь без ролей. Расспросите партнёра о его настоящей жизни.","2 · Енді рөлсіз. Әріптесіңізден нақты өмірі туралы сұраңыз."],
m706:["Как долго вы живёте в этом городе? · учите английский? · знакомы со старым другом? · пользуетесь этим телефоном?","Осы қалада қанша уақыт тұрасыз? · ағылшын тілін үйренесіз? · ескі досыңызды білесіз?"],
m707:["Обратная связь","Кері байланыс"],
m708:["1 · Преподаватель берёт карточку A. Вы берёте карточку B.","1 · Оқытушы A картасын алады. Сіз B картасын аласыз."],
m709:["Сегодня вы — этот человек. Отвечайте на вопросы преподавателя в роли.","Бүгін сіз — осы адамсыз. Оқытушының сұрақтарына рөлде жауап беріңіз."],
m710:["Задайте минимум четыре вопроса How long…? Затем поменяйтесь карточками с преподавателем и пройдите ещё раз.","Кемінде төрт How long…? сұрағын қойыңыз, содан кейін оқытушымен карта ауыстырыңыз."],
m711:["2 · Теперь без ролей. Вы и преподаватель расспрашиваете друг друга о настоящей жизни.","2 · Енді рөлсіз. Оқытушымен нақты өмір туралы сұрасыңыз."],
m712:["Как долго вы живёте в этом городе? · учите английский? · знакомы со старым другом? · пользуетесь этим телефоном?","Осы қалада қанша уақыт тұрасыз? · ағылшын тілін үйренесіз?"],
m713:["Обратная связь","Кері байланыс"],
m714:["1 · Сделайте это правдой о себе. Напишите шесть предложений.","1 · Мұны өзіңіз туралы шындыққа айналдырыңыз. Алты сөйлем жазыңыз."],
m715:["Используйте for три раза и since три раза. Каждое предложение должно быть верным и сегодня.","for-ды үш рет, since-ті үш рет қолданыңыз. Әр сөйлем бүгін де дұрыс болуы керек."],
m716:["2 · Теперь скажите это вслух. Запишите себя или проговорите дважды.","2 · Енді дауыстап айтыңыз. Өзіңізді жазып алыңыз немесе екі рет айтыңыз."],
m717:["Ответьте вслух на три вопроса: How long have you studied English? What did you use to want to be? How long have you known your oldest friend? Каждый ответ — дважды; второй раз получается быстрее и чище.","Үш сұраққа дауыстап жауап беріңіз. Әр жауапты екі рет айтыңыз."],
m801:["Отметьте всё, что вы уже умеете.","Істей алатыныңыздың бәрін белгілеңіз."],
m802:["Преподавателю","Оқытушыға"],
u1112q101:["Выберите три вещи, которые вы больше всего хотели бы иметь в работе.","Жұмыста ең қалайтын үш нәрсені таңдаңыз."],
u1112q102:["Выберите ровно три, затем напишите одну строку — от какой из трёх вы отказались бы первой.","Дәл үшеуін таңдап, үшеуінің қайсысынан бірінші бас тартатыныңызды бір жолмен жазыңыз."],
u1112q103:["Выберите ровно три, затем скажите преподавателю, от какой отказались бы первой.","Дәл үшеуін таңдап, қайсысынан бірінші бас тартатыныңызды оқытушыға айтыңыз."],
u1112q104:["Выберите ровно три, затем найдите в группе того, кто выбрал иначе.","Дәл үшеуін таңдап, топтан басқаша таңдаған адамды табыңыз."],
u1112q105:["Правильного ответа нет. Только три — сам выбор и есть задание.","Дұрыс жауап жоқ. Тек үшеуі — таңдаудың өзі тапсырма."],
u1112q106:["Запишите","Жазып алыңыз"],
q107:["Обсудите","Талқылаңыз"],
u1112q205:["3 · Дополните каждое предложение выражением с in.","3 · Әр сөйлемді in-мен келетін тіркеспен толықтырыңыз."],
u1112q206:["в спешке · в беспорядке · подробно · посередине · в неприятностях","асығыс · ретсіз · егжей-тегжейлі · ортасында · қиындықта"],
u1112q207:["4 · Какое слово подходит? Выберите естественную пару.","4 · Қай сөз келеді? Табиғи жұпты таңдаңыз."],
u1112q209:["5 · Какое слово лишнее? Выберите одно в каждой строке.","5 · Қай сөз артық? Әр жолда біреуін таңдаңыз."],
q210:["Три описывают, как вы работаете; одно — это человек.","Үшеуі қалай жұмыс істейтініңізді сипаттайды, біреуі — адам."],
u1112q213:["6 · Работа в парах. Проверьте друг друга по словам.","6 · Жұпта жұмыс. Бір-біріңізді сөздер бойынша тексеріңіз."],
u1112q214:["Студент A читает значение с карточки A. Студент B называет слово, не подглядывая. Затем поменяйтесь.","A студенті мағынаны оқиды, B студенті сөзді айтады. Содан кейін ауысыңыз."],
u1112q215:["По пять каждому. Если партнёр застрял, подскажите первый звук, а не ответ.","Әрқайсысына бестен. Әріптесіңіз тұрып қалса, жауапты емес, бірінші дыбысты айтыңыз."],
u1112q216:["6 · Преподаватель читает значение. Назовите слово, не подглядывая.","6 · Оқытушы мағынасын оқиды. Қарамай сөзді айтыңыз."],
u1112q217:["Десять значений, затем поменяйтесь: вы читаете, преподаватель отвечает.","Он мағына, содан кейін ауысыңыз."],
u1112q301:["Прочитайте эти четыре предложения из записи и текста.","Жазба мен мәтіндегі осы төрт сөйлемді оқыңыз."],
u1112q302:["В каком предложении to отвечает на вопрос «зачем?»","Қай сөйлемде to «неге?» деген сұраққа жауап береді?"],
u1112q303:["Где стоит инфинитив","Инфинитив қай жерде тұрады"],
u1112q310:["ФОРМА. to + начальная форма глагола. Она никогда не меняется.","ФОРМАСЫ. to + етістіктің бастапқы формасы. Ол ешқашан өзгермейді."],
q311:["УПОТРЕБЛЕНИЕ. Четыре места: после определённых глаголов, после прилагательного, после существительного с be и для ответа «зачем».","ҚОЛДАНЫЛУЫ. Төрт орын: белгілі етістіктерден кейін, сын есімнен кейін, be-мен зат есімнен кейін және «неге» дегенге жауап беру үшін."],
q312:["ОТРИЦАНИЕ. not ставится впереди: He decided not to apply.","БОЛЫМСЫЗДЫҚ. not алдында тұрады: He decided not to apply."],
q313:["Нельзя: «My job is advise clients», «I want going home», «I enjoy to work».","Былай болмайды: «My job is advise clients», «I want going home», «I enjoy to work»."],
q314:["Половина с -ing была в юнитах 4 и 10. Задание 4 сводит их вместе.","-ing жартысы 4 және 10-бөлімдерде болды. 4-тапсырма оларды біріктіреді."],
q320:["ФОРМА. to + начальная форма глагола — to advise, to recruit, to be. Она не меняется ни по лицу, ни по времени: I want to go, she wants to go, they wanted to go.","ФОРМАСЫ. to + етістіктің бастапқы формасы. Ол жақ пен шаққа қарай өзгермейді."],
q321:["УПОТРЕБЛЕНИЕ 1 — после определённых глаголов: want, need, hope, decide, learn, expect, offer, agree, promise, try, would like, seem. После них всегда to, никогда -ing.","ҚОЛДАНЫЛУЫ 1 — белгілі етістіктерден кейін. Олардан кейін әрқашан to, ешқашан -ing емес."],
q322:["УПОТРЕБЛЕНИЕ 2 — после прилагательного: It's important to answer every enquiry. Схема: it's + прилагательное + to + глагол.","ҚОЛДАНЫЛУЫ 2 — сын есімнен кейін: it's + сын есім + to + етістік."],
q323:["УПОТРЕБЛЕНИЕ 3 — после существительного с be. Именно на этом построен урок: My job is to… One of my main roles is to… The plan is to…","ҚОЛДАНЫЛУЫ 3 — be-мен зат есімнен кейін. Сабақ дәл соған құрылған."],
q324:["УПОТРЕБЛЕНИЕ 4 — чтобы сказать «зачем». She went to the meeting to explain the system. Здесь to значит «чтобы». Английский не использует тут for + глагол.","ҚОЛДАНЫЛУЫ 4 — «неге» дегенді айту үшін. Мұнда to «үшін» дегенді білдіреді."],
q325:["Четыре ошибки: «My job is advise clients» (пропущено to) · «I want going home» (не та форма после want) · «I enjoy to work» (после enjoy нужен -ing) · «I went there for ask» (нужно to ask).","Төрт қате: to түсіп қалуы · want-тан кейін қате форма · enjoy-дан кейін -ing керек · for + етістік."],
q326:["Короткий список на запоминание: enjoy, finish, mind, suggest, give up, keep, spend time — все берут -ing. Почти всё остальное на этой странице берёт to.","Есте сақтайтын қысқа тізім: enjoy, finish, mind, suggest, give up, keep, spend time — бәрі -ing алады."],
u1112q401:["1 · Дополните каждое предложение: to + глагол в скобках.","1 · Әр сөйлемді толықтырыңыз: to + жақшадағы етістік."],
u1112q403:["2 · Напишите второе предложение так, чтобы смысл совпал с первым.","2 · Екінші сөйлемді бірінші сөйлеммен мағынасы бірдей етіп жазыңыз."],
u1112q405:["3 · В каждом предложении одно слово неверное. Нажмите на него.","3 · Әр сөйлемде бір сөз қате. Оны басыңыз."],
u1112q407:["4 · to + глагол или глагол + -ing? Выберите подходящую форму.","4 · to + етістік пе, әлде етістік + -ing пе? Сәйкес форманы таңдаңыз."],
u1112q409:["5 · Теперь добавьте for или since и поставьте глагол в Present Perfect.","5 · Енді for немесе since қосып, етістікті Present Perfect-ке қойыңыз."],
u1112q410:["Форма прошлого урока, тема этого.","Өткен сабақтың формасы, осы сабақтың тақырыбы."],
u1112q411:["6 · Расставьте слова по порядку. Нажимайте по одному.","6 · Сөздерді ретімен қойыңыз. Бір-бірлеп басыңыз."],
u1112q501:["Прежде чем читать: что происходит с объёмом бумажной работы, когда команда перестаёт сидеть в одном офисе?","Оқымас бұрын: команда бір кеңседе отыруды қойғанда қағаз жұмысының көлемі не болады?"],
u1112q502:["Сначала решите. Ответ — во втором абзаце.","Алдымен шешіңіз. Жауап екінші абзацта."],
u1112q505:["1 · Прочитайте один раз. Подберите заголовок к каждому абзацу.","1 · Бір рет оқыңыз. Әр абзацқа тақырып таңдаңыз."],
u1112q507:["2 · Прочитайте ещё раз. Верно или неверно?","2 · Қайта оқыңыз. Дұрыс па, бұрыс па?"],
u1112q509:["3 · Найдите в тексте слово или выражение, которое означает…","3 · Мәтіннен мына мағынадағы сөзді немесе тіркесті табыңыз…"],
u1112q511:["4 · Какие из этих сочетаний встречаются в тексте как to + глагол? Отметьте все.","4 · Мәтінде қайсысы to + етістік түрінде кездеседі?"],
q512:["Четыре из шести. Остальные два — форма на -ing.","Алтауының төртеуі. Қалған екеуі — -ing формасы."],
q513:["Запишите","Жазып алыңыз"],
q514:["Обсудите","Талқылаңыз"],
q515:["Работа в парах. По две минуты каждому, затем смените партнёра.","Жұпта жұмыс. Әрқайсысына екі минуттан."],
q516:["Обсудите","Талқылаңыз"],
q517:["Ответьте, затем задайте те же три вопроса преподавателю.","Жауап беріп, сол үш сұрақты оқытушыға қойыңыз."],
u1112q601:["Послушайте. Кто это говорит — первый, второй или третий?","Тыңдаңыз. Мұны кім айтады — бірінші, екінші, әлде үшінші ме?"],
u1112q602:["1 — директор по рекламе · 2 — управляющий рестораном · 3 — администратор суда. Нажмите на говорящего, чтобы прослушать снова.","1 — жарнама директоры · 2 — мейрамхана менеджері · 3 — сот әкімшісі."],
u1112q603:["Каждая из этих шести реплик использует форму этого урока. Послушайте ещё раз и посчитайте инфинитивы.","Осы алты сөйлемнің әрқайсысы осы сабақтың формасын қолданады."],
u1112q701:["Полезные фразы","Пайдалы сөз тіркестері"],
u1112q702:["1 · Работа в парах. Студент A берёт карточку A, студент B — карточку B.","1 · Жұпта жұмыс. A студенті A картасын, B студенті B картасын алады."],
u1112q703:["Вы — этот человек. Опишите работу, не называя её — партнёр угадывает.","Сіз — осы адамсыз. Жұмысты атамай сипаттаңыз — әріптесіңіз тапсын."],
u1112q704:["Используйте «My job is to…» и «It's difficult to…» минимум по разу. Затем поменяйтесь карточками и пройдите ещё раз.","«My job is to…» және «It's difficult to…» кемінде бір реттен қолданыңыз."],
u1112q705:["2 · Теперь без карточек. Опишите реальную работу — свою или в семье.","2 · Енді картасыз. Нақты жұмысты сипаттаңыз."],
u1112q706:["Четыре предложения: что нужно делать, что важно делать, что трудно делать, как долго он этим занимается.","Төрт сөйлем: не істеу керек, не істеу маңызды, не істеу қиын, қанша уақыт істеп жүр."],
u1112q707:["Обратная связь","Кері байланыс"],
u1112q708:["1 · Преподаватель берёт карточку A. Вы берёте карточку B.","1 · Оқытушы A картасын алады. Сіз B картасын аласыз."],
u1112q709:["Вы — этот человек. Опишите работу, не называя её — преподаватель угадывает.","Сіз — осы адамсыз. Жұмысты атамай сипаттаңыз."],
u1112q710:["Используйте «My job is to…» и «It's difficult to…» минимум по разу. Затем поменяйтесь карточками с преподавателем.","Содан кейін оқытушымен карта ауыстырыңыз."],
u1112q711:["2 · Теперь без карточек. Опишите реальную работу — свою или в семье.","2 · Енді картасыз. Нақты жұмысты сипаттаңыз."],
q712:["Четыре предложения: что нужно делать, что важно делать, что трудно делать, как долго он этим занимается.","Төрт сөйлем."],
q713:["Обратная связь","Кері байланыс"],
q714:["1 · Опишите работу, которую хорошо знаете. Напишите шесть предложений.","1 · Жақсы білетін жұмысты сипаттаңыз. Алты сөйлем жазыңыз."],
q715:["Используйте по одному разу: My job is to… · One of my main roles is to… · It's important to… · It's difficult to… · предложение с «зачем» · предложение с for или since.","Әрқайсысын бір реттен қолданыңыз."],
q716:["2 · Теперь скажите вслух. Говорите минуту без остановки.","2 · Енді дауыстап айтыңыз. Бір минут тоқтамай сөйлеңіз."],
q717:["Запишите себя, если можете. Прослушайте и посчитайте, сколько раз вы сказали to + глагол. Затем скажите ещё раз, быстрее.","Мүмкін болса, өзіңізді жазып алыңыз."],
u1112q801:["Отметьте всё, что вы уже умеете.","Істей алатыныңыздың бәрін белгілеңіз."],
q802:["Преподавателю","Оқытушыға"],
u101:["Прочитайте шесть вопросов. Какие два вы меньше всего хотели бы услышать?","Алты сұрақты оқыңыз. Қай екеуін ести қалғыңыз келмейді?"],
u102:["Выберите два, затем напишите одну строку — что бы вы на самом деле ответили на один из них.","Екеуін таңдап, біреуіне не жауап беретініңізді бір жолмен жазыңыз."],
u103:["Выберите два, затем скажите преподавателю, что бы вы ответили на один из них.","Екеуін таңдап, біреуіне не жауап беретініңізді оқытушыға айтыңыз."],
u104:["Выберите два, затем сравните с партнёром. Совпали?","Екеуін таңдап, әріптесіңізбен салыстырыңыз. Сәйкес келді ме?"],
u105:["Четыре из этих шести — реальные вопросы реальных компаний. Три из них есть в списке, который вы сегодня отработаете.","Осы алтауының төртеуі — нақты компаниялардың нақты сұрақтары."],
u106:["Запишите","Жазып алыңыз"],
u107:["Обсудите","Талқылаңыз"],
u201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
u202:["Показать перевод","Аудармасын көрсету"],
u203:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u205:["3 · Какое слово подходит? Сначала прочитайте предложение целиком.","3 · Қай сөз келеді? Алдымен сөйлемді толық оқыңыз."],
u207:["4 · Послушайте и ответьте. Да или нет?","4 · Тыңдап, жауап беріңіз. Иә ме, жоқ па?"],
u208:["Девять коротких вопросов о словах этого юнита. Нажмите на номер, чтобы прослушать снова.","Осы бөлімнің сөздері туралы тоғыз қысқа сұрақ."],
u213:["5 · Работа в парах. Проверьте друг друга по словам.","5 · Жұпта жұмыс. Бір-біріңізді тексеріңіз."],
u214:["Студент A читает значение с карточки A. Студент B называет слово. Затем поменяйтесь.","A студенті мағынаны оқиды, B студенті сөзді айтады. Содан кейін ауысыңыз."],
u215:["По пять каждому. Первый звук — только если партнёр застрял.","Әрқайсысына бестен. Бірінші дыбыс — тек тұрып қалғанда."],
u216:["5 · Преподаватель читает значение. Назовите слово, не подглядывая.","5 · Оқытушы мағынасын оқиды. Қарамай сөзді айтыңыз."],
u217:["Десять значений, затем поменяйтесь.","Он мағына, содан кейін ауысыңыз."],
u301:["Прочитайте четыре ответа Даниэль из записи.","Жазбадағы Даниэльдің төрт жауабын оқыңыз."],
u302:["Два из этих четырёх используют грамматику этого юнита. Какие два?","Осы төртеуінің екеуі осы бөлімнің грамматикасын қолданады. Қайсысы?"],
u303:["Один — Present Perfect с for; другой — инфинитив с to.","Біреуі — for-мен Present Perfect; екіншісі — to-мен инфинитив."],
u304:["Пять вопросов","Бес сұрақ"],
u310:["ФОРМА ОТВЕТА. Ответ, потом один пример, потом стоп. Два предложения лучше пяти.","ЖАУАПТЫҢ ПІШІНІ. Жауап, бір мысал, содан кейін тоқтау."],
u311:["О СЛАБОЙ СТОРОНЕ. Назовите настоящую, потом добавьте, что вы с этим делаете: «…but I'm working on that».","ӘЛСІЗ ЖАҚ ТУРАЛЫ. Шынайысын атап, немен айналысып жатқаныңызды қосыңыз."],
u312:["ГРАММАТИКА. for / since — как долго, и to + глагол — чего вы хотите.","ГРАММАТИКА. for / since — қанша уақыт, to + етістік — не қалайсыз."],
u313:["Нельзя: «I work there since six years», «I have no weaknesses», «No, I don't have any questions».","Былай болмайды: «I work there since six years», «I have no weaknesses»."],
u314:["Это последний языковой материал уровня. Всё в нём уже было пройдено.","Бұл — деңгейдің соңғы тілдік материалы. Ондағының бәрі бұрын өтілген."],
u320:["ФОРМА ХОРОШЕГО ОТВЕТА. Ответьте одним предложением, дайте один конкретный пример, потом остановитесь. Даниэль делает так каждый раз. Два предложения — и всё.","ЖАҚСЫ ЖАУАПТЫҢ ПІШІНІ. Бір сөйлеммен жауап беріп, бір нақты мысал келтіріп, тоқтаңыз."],
u321:["ОПЫТ. Здесь Present Perfect оправдывает себя. «I've worked as a… for six years» говорит, что вы всё ещё этим занимаетесь. «I worked there for two years» говорит, что та работа закончилась.","ТӘЖІРИБЕ. Мұнда Present Perfect өз орнын табады."],
u322:["ПОЧЕМУ ЭТА РАБОТА. Никогда не критикуйте нынешнего работодателя. Сделайте, как Даниэль: сначала хорошее, потом чего вы хотите.","НЕГЕ ОСЫ ЖҰМЫС. Қазіргі жұмыс берушіні ешқашан сынамаңыз."],
u323:["СИЛЬНЫЕ И СЛАБЫЕ СТОРОНЫ. Две-три сильных через «I'm good at…» и «I can…». Потом одна настоящая слабая — и обязательно закончите её. Слабая сторона без окончания звучит как предупреждение.","КҮШТІ ЖӘНЕ ӘЛСІЗ ЖАҚТАР. Екі-үш күшті жақ, содан кейін бір шынайы әлсіз жақ — және оны міндетті түрде аяқтаңыз."],
u324:["Три вещи, из-за которых теряют работу: «I work there since six years» · «I don't really have any weaknesses» · «No, I don't have any questions».","Жұмыстан айырылатын үш нәрсе."],
u325:["Каждая конструкция в этой таблице пришла из более раннего юнита уровня. Собеседование — это не новый язык, это тот язык, который у вас уже есть, произнесённый под давлением.","Бұл кестедегі әр құрылым деңгейдің бұрынғы бөлімдерінен келген."],
u401:["1 · Соотнесите каждый вопрос с лучшим началом ответа.","1 · Әр сұрақты жауаптың ең жақсы басталуымен сәйкестендіріңіз."],
u403:["2 · Дополните ответы на собеседовании.","2 · Сұхбаттағы жауаптарды толықтырыңыз."],
u405:["3 · В каждом ответе одно слово неверное. Нажмите на него.","3 · Әр жауапта бір сөз қате. Оны басыңыз."],
u407:["4 · Present Perfect, Past Simple или инфинитив? Весь уровень в одном задании.","4 · Present Perfect, Past Simple немесе инфинитив? Бір тапсырмада бүкіл деңгей."],
u501:["Послушайте начало. Кто такая Филиппа Харт и кого ищет компания?","Басын тыңдаңыз. Филиппа Харт кім және компания кімді іздейді?"],
u503:["1 · Теперь послушайте собеседование. Расставьте шесть вопросов в том порядке, в каком вы их слышите.","1 · Енді сұхбатты тыңдаңыз. Алты сұрақты естіген ретіңізбен қойыңыз."],
u504:["Нажмите на кнопку ниже, чтобы прослушать эту часть снова.","Осы бөлікті қайта тыңдау үшін төмендегі түймені басыңыз."],
u505:["2 · Послушайте ещё раз и дополните ответы Даниэль.","2 · Қайта тыңдап, Даниэльдің жауаптарын толықтырыңыз."],
u507:["3 · Сильная сторона или слабая? Выберите для каждой фразы Даниэль.","3 · Күшті жақ па, әлсіз жақ па? Даниэльдің әр сөйлемі үшін таңдаңыз."],
u508:["Обратите внимание, как она заканчивает слабую сторону: «…but I'm working on that». Никогда не оставляйте слабую сторону открытой.","Ол әлсіз жақты қалай аяқтайтынына назар аударыңыз."],
u601:["1 · Расставьте разделы резюме в том порядке, в каком они идут.","1 · Түйіндеме бөлімдерін ретімен қойыңыз."],
u603:["2 · Для чего нужен каждый раздел резюме?","2 · Түйіндеменің әр бөлімі не үшін керек?"],
u605:["3 · Какая строка подходит для резюме, а какая нет?","3 · Қай жол түйіндемеге келеді, қайсысы келмейді?"],
u606:["Резюме — короткое, формальное и фактическое. Это не письмо и не переписка.","Түйіндеме — қысқа, ресми және нақты. Бұл хат та, чат та емес."],
u607:["4 · Найдите в резюме фразу, которая…","4 · Түйіндемеден мына фразаны табыңыз…"],
u701:["Полезные фразы","Пайдалы сөз тіркестері"],
u702:["1 · Напишите своё резюме. Используйте шесть разделов Даниэль и её фразы.","1 · Өз түйіндемеңізді жазыңыз. Даниэльдің алты бөлімі мен фразаларын қолданыңыз."],
u703:["Настоящее или выдуманное, но пусть будет непротиворечивым — сейчас вас по нему будут собеседовать.","Шынайы немесе ойдан шығарылған, бірақ қайшылықсыз болсын."],
u704:["2 · Работа в парах. Студент A — интервьюер, студент B — кандидат.","2 · Жұпта жұмыс. A студенті — сұхбат алушы, B студенті — үміткер."],
u705:["Кандидат отвечает по своему резюме. Интервьюер задаёт пять вопросов и один свой.","Үміткер өз түйіндемесі бойынша жауап береді."],
u706:["Проведите один раз, затем поменяйтесь ролями и проведите ещё раз по резюме второго. Второй прогон и есть главный.","Бір рет өткізіп, рөлдерді ауыстырып қайталаңыз."],
u707:["Обратная связь","Кері байланыс"],
u708:["2 · Преподаватель — интервьюер. Вы — кандидат.","2 · Оқытушы — сұхбат алушы. Сіз — үміткер."],
u709:["Отвечайте по резюме, которое только что написали. Преподаватель задаёт пять вопросов и один свой.","Жаңа жазған түйіндемеңіз бойынша жауап беріңіз."],
u710:["Проведите один раз, затем поменяйтесь ролями — вы собеседуете преподавателя.","Бір рет өткізіп, рөлдерді ауыстырыңыз."],
u711:["Обратная связь","Кері байланыс"],
u712:["2 · Ответьте на пять вопросов вслух, по своему резюме.","2 · Өз түйіндемеңіз бойынша бес сұраққа дауыстап жауап беріңіз."],
u713:["Запишите себя, если можете. По два предложения на ответ, никогда одним словом. Затем прослушайте и проверьте три вещи: верно ли вы сказали for или since, закончили ли слабую сторону и был ли у вас вопрос в конце.","Мүмкін болса, өзіңізді жазып алыңыз. Әр жауапқа екі сөйлемнен."],
u801:["Это последний урок уровня Pre-Intermediate. Отметьте всё, что вы уже умеете.","Бұл — Pre-Intermediate деңгейінің соңғы сабағы. Істей алатыныңызды белгілеңіз."],
u802:["Преподавателю","Оқытушыға"],
/* ---- Unit 10 ---- */
q101:["Посмотрите на три продукта. Какой вы съели бы с удовольствием, а какой оставили бы?","Үш тағамға қараңыз. Қайсысын қуана жер едіңіз, қайсысын қалдырар едіңіз?"],
q102:["Правильного ответа нет. Выберите, затем напишите одну строку — почему.","Дұрыс жауап жоқ. Таңдаңыз да, неге екенін бір жолмен жазыңыз."],
q103:["Правильного ответа нет. Выберите, затем объясните преподавателю почему.","Дұрыс жауап жоқ. Таңдаңыз да, мұғалімге себебін айтыңыз."],
q104:["Правильного ответа нет. Выберите, затем сравните с партнёром — найдите одно расхождение.","Дұрыс жауап жоқ. Таңдаңыз да, серіктесіңізбен салыстырыңыз — бір келіспеушілік табыңыз."],
q105:["Запишите","Жазып алыңыз"],
q106:["Обсудите","Талқылаңыз"],
q201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
q202:["Показать перевод","Аудармасын көрсету"],
q203:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
q205:["3 · Какое слово подходит? Эти пары легко перепутать.","3 · Қай сөз келеді? Бұл жұптарды шатастыру оңай."],
q206:["Сначала прочитайте всё предложение. Оба слова о еде, но подходит только одно.","Алдымен бүкіл сөйлемді оқыңыз. Екі сөз де тамақ туралы, бірақ біреуі ғана келеді."],
q207:["4 · Распределите восемь слов по колонкам.","4 · Сегіз сөзді бағандарға бөліңіз."],
q208:["Нажмите на слово, затем на нужную колонку.","Сөзді басыңыз, содан кейін керекті бағанды басыңыз."],
q209:["5 · В каждой группе одно слово лишнее. Нажмите на него.","5 · Әр топта бір сөз артық. Оны басыңыз."],
q213:["6 · Работа в парах. Опишите продукт, не называя его.","6 · Жұппен жұмыс. Тағамды атамай сипаттаңыз."],
q214:["Студент A читает карточку и описывает еду тремя сегодняшними словами. Студент B угадывает. Затем поменяйтесь.","А студент картаны оқып, бүгінгі үш сөзбен тағамды сипаттайды. B студент табады. Содан соң ауысыңыздар."],
q215:["По пять продуктов каждому. Если партнёр не угадал, добавьте ещё одно слово — не называйте продукт.","Әрқайсысына бес тағам. Серіктесіңіз таба алмаса, тағы бір сөз қосыңыз — тағамды атамаңыз."],
q216:["6 · Опишите продукт преподавателю, не называя его.","6 · Тағамды атамай мұғалімге сипаттаңыз."],
q217:["Каждый раз используйте три сегодняшних слова. Преподаватель угадывает, затем описывает один продукт вам.","Әр жолы бүгінгі үш сөзді қолданыңыз. Мұғалім табады, содан кейін сізге бір тағамды сипаттайды."],
q301:["Прочитайте эти четыре предложения.","Мына төрт сөйлемді оқыңыз."],
q302:["Посмотрите на слово непосредственно перед формой -ing. Какое предложение лишнее и почему?","-ing тұлғасының алдындағы сөзге қараңыз. Қай сөйлем артық және неге?"],
q303:["Где стоит форма -ing","-ing тұлғасы қайда тұрады"],
q304:["Теперь выберите правильную форму. Сначала посмотрите на слово перед пропуском.","Енді дұрыс тұлғаны таңдаңыз. Алдымен бос орынның алдындағы сөзге қараңыз."],
q305:["ФОРМА. глагол + -ing. Правила удвоения и выпадения сохраняются.","ТҰЛҒА. етістік + -ing. Қосарлау және түсіру ережелері сақталады."],
q306:["УПОТРЕБЛЕНИЕ. Форма -ing — это глагол в роли существительного: подлежащее, после предлога, после ряда глаголов.","ҚОЛДАНЫСЫ. -ing тұлғасы — зат есім рөліндегі етістік: бастауыш, көмекші сөзден кейін, кейбір етістіктерден кейін."],
q307:["Нельзя: «I am interested to learn», «I gave up to eat meat».","Болмайды: «I am interested to learn», «I gave up to eat meat»."],
q308:["В следующем уроке форма -ing вернётся внутри пассива.","Келесі сабақта -ing тұлғасы ырықсыз етісте қайта кездеседі."],
s305:["ФОРМА. глагол + -ing. Три правила написания: убрать немую -e, удвоить конечную согласную после краткой гласной, -ie переходит в -y.","ТҰЛҒА. етістік + -ing. Үш жазу ережесі: соңғы үнсіз -e түсіріледі, қысқа дауыстыдан кейінгі дауыссыз қосарланады, -ie -y-ге ауысады."],
s306:["УПОТРЕБЛЕНИЕ 1 — подлежащее. Когда речь о самом действии, оно выносится вперёд с -ing.","ҚОЛДАНЫСЫ 1 — бастауыш. Әрекеттің өзі туралы айтқанда, ол -ing-пен алға шығады."],
s307:["УПОТРЕБЛЕНИЕ 2 — после предлога. Всегда -ing: interested in learning, good at baking, before going out.","ҚОЛДАНЫСЫ 2 — көмекші сөзден кейін. Әрқашан -ing: interested in learning, good at baking, before going out."],
s308:["УПОТРЕБЛЕНИЕ 3 — после определённых глаголов: give up, keep, finish, avoid, suggest, enjoy, stop. Другая группа требует to + глагол: want, decide, hope, need.","ҚОЛДАНЫСЫ 3 — белгілі етістіктерден кейін: give up, keep, finish, avoid, suggest, enjoy, stop. Басқа топ to + етістік талап етеді: want, decide, hope, need."],
s309:["Три ошибки: «interested to learn», «gave up to eat», «enjoy to cook».","Үш қате: «interested to learn», «gave up to eat», «enjoy to cook»."],
s310:["Форма -ing вернётся во втором уроке этого юнита внутри пассива, и снова в Юните 12 с инфинитивом.","-ing тұлғасы осы бөлімнің 2-сабағында ырықсыз етісте, 12-бөлімде инфинитивпен қайта кездеседі."],
q310:["Пять предложений. Последние два — из аудиозаписи учебника; нажмите Listen на них.","Бес сөйлем. Соңғы екеуі оқулық жазбасынан; соларда Listen басыңыз."],
q401:["1 · Напишите правильную форму глагола в скобках.","1 · Жақшадағы етістіктің дұрыс тұлғасын жазыңыз."],
q402:["Либо -ing, либо to + глагол. Смотрите на слово перед пропуском.","Не -ing, не to + етістік. Бос орынның алдындағы сөзге қараңыз."],
q403:["2 · В каждом предложении одно слово неверно. Нажмите на него.","2 · Әр сөйлемде бір сөз қате. Оны басыңыз."],
q404:["Все семь предложений о еде. В шести есть ошибка в форме глагола.","Жеті сөйлемнің бәрі тамақ туралы. Алтауында етістік тұлғасында қате бар."],
q405:["3 · Составьте предложение из слов.","3 · Сөздерден сөйлем құрастырыңыз."],
q406:["Нажимайте на слова по порядку. Нажмите ещё раз, чтобы убрать.","Сөздерді ретімен басыңыз. Алып тастау үшін қайта басыңыз."],
q407:["4 · Перепишите предложение так, чтобы оно начиналось с данного слова. Смысл должен сохраниться.","4 · Сөйлемді берілген сөзден бастап қайта жазыңыз. Мағынасы сақталуы керек."],
q408:["Напечатайте всё новое предложение.","Жаңа сөйлемді толық теріңіз."],
q409:["5 · повтор. Выберите правильную форму после слова времени.","5 · қайталау. Уақыт сөзінен кейін дұрыс тұлғаны таңдаңыз."],
q410:["После when, as soon as, before, after, until используется настоящее время, а не will.","when, as soon as, before, after, until кейін will емес, осы шақ қолданылады."],
q411:["Проверьте задание 5 вслух и назовите повтор: придаточные времени из Юнита 9.","5-тапсырманы дауыстап тексеріп, қайталауды атаңыз: 9-бөлімдегі уақыт бағыныңқылары."],
q501:["Перед чтением: одни люди любят очень горькую еду, другие не могут её проглотить.","Оқу алдында: біреулер өте ащы тағамды жақсы көреді, басқалары оны жұта алмайды."],
q502:["Как вы думаете, в чём главная причина? Выберите один вариант, затем прочитайте и проверьте.","Сіздіңше, басты себебі не? Бір нұсқаны таңдап, оқып тексеріңіз."],
q503:["Правильного ответа пока нет. Это ваше предположение.","Әзірге дұрыс жауап жоқ. Бұл сіздің болжамыңыз."],
q504:["1 · Прочитайте один раз. Соотнесите заголовок с нужным абзацем.","1 · Бір рет оқыңыз. Тақырыпты керекті абзацпен сәйкестендіріңіз."],
q505:["2 · Прочитайте ещё раз. Верно или неверно?","2 · Тағы оқыңыз. Дұрыс па, бұрыс па?"],
q506:["3 · Найдите в тексте слово, которое означает…","3 · Мәтіннен мағынасы мынадай сөзді табыңыз…"],
q507:["Каждый раз одно слово, точно как в тексте.","Әр жолы бір сөз, мәтіндегідей дәл."],
q508:["4 · В тексте форма -ing встречается пять раз. Какие из них есть в тексте? Нажмите на все.","4 · Мәтінде -ing тұлғасы бес рет кездеседі. Қайсысы мәтінде бар? Барлығын басыңыз."],
q509:["Четыре есть в тексте, двух нет. Просматривайте — не перечитывайте с начала.","Төртеуі мәтінде бар, екеуі жоқ. Шолып қараңыз — басынан қайта оқымаңыз."],
q510:["Обсудите","Талқылаңыз"],
q511:["Запишите","Жазып алыңыз"],
q601:["1 · Послушайте. Какое блюдо описывает каждый говорящий? Нажмите на говорящего, чтобы прослушать снова.","1 · Тыңдаңыз. Әр сөйлеуші қандай тағамды сипаттайды? Қайта тыңдау үшін сөйлеушіні басыңыз."],
q602:["2 · Послушайте ещё раз и напишите слово вкуса, которое вы слышите.","2 · Қайта тыңдап, естіген дәм сөзін жазыңыз."],
q603:["3 · Произношение. Послушайте эти шесть слов. Сколько слогов вы реально слышите?","3 · Айтылым. Мына алты сөзді тыңдаңыз. Шын мәнінде қанша буын естисіз?"],
q604:["В быстрой речи английский теряет слог внутри некоторых длинных слов. Выбирайте то, что слышите, а не то, что видите.","Жылдам сөйлегенде ағылшын тілі кейбір ұзын сөздердің ішіндегі буынды түсіреді. Көргеніңізді емес, естігеніңізді таңдаңыз."],
q605:["Средний гласный исчезает. Копировать это не нужно — нужно узнавать.","Ортаңғы дауысты жоғалады. Оны көшірудің қажеті жоқ — тану керек."],
q701:["1 · Работа в парах. Возьмите карточку и подготовьтесь за две минуты.","1 · Жұппен жұмыс. Карта алып, екі минут дайындалыңыз."],
q702:["Не показывайте карточку. Опишите блюдо так, чтобы партнёр его представил. Минимум две формы -ing и три слова вкуса.","Картаны көрсетпеңіз. Серіктесіңіз елестете алатындай сипаттаңыз. Кемінде екі -ing тұлғасы және үш дәм сөзі."],
q703:["2 · После второго круга скажите классу, какое блюдо вы теперь хотите попробовать.","2 · Екінші айналымнан кейін сыныпқа қазір қандай тағамды татқыңыз келетінін айтыңыз."],
q704:["Обратная связь после второго круга, не после первого. По две строки: одна удачная фраза, одна форма для исправления.","Кері байланыс екінші айналымнан кейін. Екі жол: бір сәтті тіркес, бір түзетілетін тұлға."],
q705:["1 · Подготовьтесь за две минуты, затем опишите блюдо преподавателю.","1 · Екі минут дайындалып, тағамды мұғалімге сипаттаңыз."],
q706:["Минимум две формы -ing и три слова вкуса. Преподаватель слушает не перебивая, затем задаёт два вопроса.","Кемінде екі -ing тұлғасы және үш дәм сөзі. Мұғалім бөлмей тыңдап, содан кейін екі сұрақ қояды."],
q707:["Не перебивайте на первом круге. Две строки в конце.","Бірінші айналымда бөлмеңіз. Соңында екі жол."],
q708:["1 · Сначала напишите описание, затем произнесите его вслух.","1 · Алдымен сипаттаманы жазып, содан кейін дауыстап айтыңыз."],
q709:["Шесть-восемь предложений о блюде вашей семьи. Минимум две формы -ing и три слова вкуса из Этапа 2.","Отбасыңыздың тағамы туралы алты-сегіз сөйлем. Кемінде екі -ing тұлғасы және 2-кезеңнен үш дәм сөзі."],
q710:["2 · Проверьте свой текст.","2 · Өз мәтініңізді тексеріңіз."],
q801:["Завершите чек-листом. Назовите повтор: придаточные времени вернулись сегодня внутри предложений о готовке.","Тексеру тізімімен аяқтаңыз. Қайталауды атаңыз: уақыт бағыныңқылары бүгін ас әзірлеу сөйлемдерінде қайта кездесті."],
w101:["Вспомните последние пять вещей, которые вы достали из шкафа. В чём они были?","Шкафтан соңғы алған бес затты еске түсіріңіз. Олар неде болды?"],
w102:["Напишите пять упаковок. По-английски или на своём языке — английские слова будут через минуту.","Бес қаптаманы жазыңыз. Ағылшынша немесе өз тіліңізде — ағылшын сөздері бір минуттан кейін болады."],
w103:["Назовите преподавателю пять упаковок. По-английски или на своём языке.","Мұғалімге бес қаптаманы атаңыз. Ағылшынша немесе өз тіліңізде."],
w104:["Назовите партнёру пять упаковок. Найдите одну общую и одну только вашу.","Серіктесіңізге бес қаптаманы атаңыз. Бір ортақ және бір тек сіздікін табыңыз."],
w105:["Запишите","Жазып алыңыз"],
w106:["Обсудите","Талқылаңыз"],
u10w201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
u10w202:["Показать перевод","Аудармасын көрсету"],
u10w203:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u10w205:["3 · В чём это обычно продаётся? Выберите естественную упаковку.","3 · Бұл әдетте неде сатылады? Табиғи қаптаманы таңдаңыз."],
u10w206:["Это устойчивые пары в английском. Учить пару быстрее, чем слово отдельно.","Бұл ағылшын тіліндегі тұрақты жұптар. Жұпты үйрену сөзді жеке үйренуден жылдам."],
u10w207:["4 · Best before или use by?","4 · Best before пе, әлде use by ма?"],
u10w208:["Одна дата про качество, другая про безопасность. Сначала прочитайте всё предложение.","Бір күн сапа туралы, екіншісі қауіпсіздік туралы. Алдымен бүкіл сөйлемді оқыңыз."],
w209:["5 · Слова с несколькими значениями. Какое значение здесь?","5 · Бірнеше мағыналы сөздер. Мұнда қай мағына?"],
w210:["Каждое из этих слов встречается в юните в двух разных ролях. Предложение решает, в какой.","Бұл сөздердің әрқайсысы бөлімде екі түрлі рөлде кездеседі. Қайсысы екенін сөйлем шешеді."],
w213:["6 · Работа в парах. Угадайте упаковку.","6 · Жұппен жұмыс. Қаптаманы табыңыз."],
w214:["Студент A называет продукт с карточки A; студент B говорит, в чём он и из чего сделана упаковка. Затем поменяйтесь.","А студент A картасынан тағам атайды; B студент оның неде екенін және неден жасалғанын айтады. Содан соң ауысыңыздар."],
w215:["По шесть каждому. Полными предложениями: Olives are sold in a glass jar.","Әрқайсысына алтау. Толық сөйлеммен: Olives are sold in a glass jar."],
w216:["6 · Преподаватель называет продукт. Скажите, в чём он продаётся.","6 · Мұғалім тағам атайды. Оның неде сатылатынын айтыңыз."],
w217:["Полными предложениями. Затем поменяйтесь, и продукты называете вы.","Толық сөйлеммен. Содан соң ауысыңыздар, тағамдарды сіз атайсыз."],
w301:["Прочитайте эти четыре предложения из записи, которую вы сейчас услышите.","Қазір тыңдайтын жазбадан мына төрт сөйлемді оқыңыз."],
w302:["Чего не хватает в этих четырёх предложениях по сравнению с обычным предложением?","Осы төрт сөйлемде әдеттегі сөйлеммен салыстырғанда не жетіспейді?"],
w303:["Одно и то же событие, двумя способами","Бір оқиға, екі тәсілмен"],
w304:["Теперь напишите причастие прошедшего времени каждого глагола.","Енді әр етістіктің өткен шақ есімшесін жазыңыз."],
w305:["ФОРМА. be + причастие прошедшего времени. Время живёт в be.","ТҰЛҒА. be + өткен шақ есімшесі. Шақ be-де тұрады."],
w306:["УПОТРЕБЛЕНИЕ. Когда исполнитель неизвестен, очевиден или неважен. by… добавляйте только когда исполнитель действительно интересен.","ҚОЛДАНЫСЫ. Орындаушы белгісіз, айқын немесе маңызды болмағанда. by… тек орындаушы шынымен қызық болғанда қосыңыз."],
w307:["Нельзя: «It was invent in 1810», «The cans are make by machine», «It is happened».","Болмайды: «It was invent in 1810», «The cans are make by machine», «It is happened»."],
w308:["Пассив вернётся в следующем уроке внутри отзыва о ресторане.","Ырықсыз етіс келесі сабақта мейрамхана пікірінде қайта кездеседі."],
v305:["ФОРМА. be + причастие. Всё, что говорит время, говорит be: is/are made для настоящего, was/were made для прошедшего. Само причастие не меняется.","ТҰЛҒА. be + есімше. Шақты be айтады: осы шақ үшін is/are made, өткен шақ үшін was/were made. Есімшенің өзі өзгермейді."],
v306:["УПОТРЕБЛЕНИЕ 1 — исполнитель неизвестен.","ҚОЛДАНЫСЫ 1 — орындаушы белгісіз."],
v307:["УПОТРЕБЛЕНИЕ 2 — исполнитель очевиден или неважен. Нам важна вещь, а не работник.","ҚОЛДАНЫСЫ 2 — орындаушы айқын немесе маңызды емес. Бізге зат маңызды, жұмысшы емес."],
v308:["УПОТРЕБЛЕНИЕ 3 — вы хотите поставить вещь вперёд. Если тема — банка, банка идёт первой, и пассив — единственный способ это сделать.","ҚОЛДАНЫСЫ 3 — затты алға шығарғыңыз келеді. Тақырып банка болса, банка бірінші тұрады, ал ырықсыз етіс — оны істеудің жалғыз жолы."],
v309:["КОГДА ДОБАВЛЯТЬ BY. Только когда исполнитель — новость. В большинстве пассивных предложений by нет вовсе.","BY ҚАШАН ҚОСЫЛАДЫ. Тек орындаушы жаңалық болғанда. Көп ырықсыз сөйлемде by мүлдем жоқ."],
v310:["Три ошибки: «It was invent» (нет причастия) · «The cans are make» (начальная форма) · «The accident was happened» (у happen нет пассива).","Үш қате: «It was invent» (есімше жоқ) · «The cans are make» (бастапқы тұлға) · «The accident was happened» (happen-де ырықсыз етіс жоқ)."],
v311:["В следующем уроке вы будете использовать пассив, чтобы жаловаться и писать отзыв.","Келесі сабақта ырықсыз етісті шағымдану және пікір жазу үшін қолданасыз."],
w310:["Пять настоящих пассивных предложений из Audio 10.4. Нажмите Listen на каждом.","Audio 10.4-тен бес нағыз ырықсыз сөйлем. Әрқайсысында Listen басыңыз."],
w401:["1 · Выберите правильную форму.","1 · Дұрыс тұлғаны таңдаңыз."],
w402:["2 · Напишите глагол в пассиве. Настоящее или прошедшее — предложение подскажет.","2 · Етістікті ырықсыз етісте жазыңыз. Осы шақ па, өткен шақ па — сөйлем айтады."],
w403:["3 · Перепишите предложение в пассиве. Не говорите, кто это сделал.","3 · Сөйлемді ырықсыз етісте қайта жазыңыз. Кім істегенін айтпаңыз."],
w404:["Напечатайте только часть после стрелки.","Тек көрсеткіден кейінгі бөлікті теріңіз."],
w405:["4 · В каждом предложении одно слово неверно. Нажмите на него.","4 · Әр сөйлемде бір сөз қате. Оны басыңыз."],
w406:["5 · повтор. Форма -ing внутри процесса. Выберите правильную форму.","5 · қайталау. Процесс ішіндегі -ing тұлғасы. Дұрыс тұлғаны таңдаңыз."],
w407:["Предлог по-прежнему требует -ing, даже в пассивном предложении.","Көмекші сөз ырықсыз сөйлемде де -ing талап етеді."],
w408:["Проверьте задание 5 вслух и назовите повтор: форма -ing из Урока 1 этого юнита.","5-тапсырманы дауыстап тексеріп, қайталауды атаңыз: осы бөлімнің 1-сабағындағы -ing тұлғасы."],
w501:["Перед прослушиванием: банки изобрели задолго до безопасного способа их открывать.","Тыңдау алдында: банкалар оларды қауіпсіз ашу тәсілінен әлдеқайда бұрын ойлап табылған."],
w502:["Сколько лет, по-вашему, прошло между банкой и безопасным консервным ножом?","Сіздіңше, банка мен қауіпсіз консерв ашқыш арасында қанша жыл өтті?"],
w503:["Сначала предположите. Предположение заставляет слушать даты.","Алдымен болжаңыз. Болжам күндерді тыңдауға мәжбүрлейді."],
w504:["1 · Прослушайте всю запись один раз. Пока ничего не пишите. Затем выберите лучший заголовок.","1 · Бүкіл жазбаны бір рет тыңдаңыз. Әзірге ештеңе жазбаңыз. Содан кейін ең жақсы тақырыпты таңдаңыз."],
w505:["2 · Теперь слушайте по частям. Нажмите на часть, чтобы прослушать снова.","2 · Енді бөлікпен тыңдаңыз. Қайта тыңдау үшін бөлікті басыңыз."],
w506:["Четыре части, четыре вопроса. Отвечайте числом или одним-двумя словами.","Төрт бөлік, төрт сұрақ. Санмен немесе бір-екі сөзбен жауап беріңіз."],
w507:["3 · Прослушайте ещё раз и дополните пассивные предложения из записи.","3 · Тағы тыңдап, жазбадағы ырықсыз сөйлемдерді толықтырыңыз."],
w508:["4 · Вторая запись. Короткий радиорепортаж о пищевых отходах. Выберите верные утверждения.","4 · Екінші жазба. Тағам қалдықтары туралы қысқа радиорепортаж. Дұрыс тұжырымдарды таңдаңыз."],
w509:["Три из пяти верны.","Бесеуінің үшеуі дұрыс."],
w510:["Обсудите","Талқылаңыз"],
w511:["Запишите","Жазып алыңыз"],
w601:["1 · Работа в парах. Возьмите карточку и подготовьте четыре-пять шагов.","1 · Жұппен жұмыс. Карта алып, төрт-бес қадам дайындаңыз."],
w602:["Не показывайте карточку. Каждый шаг должен быть в пассиве. Партнёр записывает шаги.","Картаны көрсетпеңіз. Әр қадам ырықсыз етісте болуы керек. Серіктесіңіз қадамдарды жазады."],
w603:["2 · Информационный пробел. Задайте партнёру три вопроса о его процессе.","2 · Ақпарат олқылығы. Серіктесіңізге процесі туралы үш сұрақ қойыңыз."],
w604:["Обратная связь после второго круга. По две строки каждому.","Кері байланыс екінші айналымнан кейін. Әрқайсысына екі жол."],
w605:["1 · Подготовьте четыре-пять шагов, затем объясните процесс преподавателю.","1 · Төрт-бес қадам дайындап, процесті мұғалімге түсіндіріңіз."],
w606:["Каждый шаг в пассиве. Преподаватель записывает шаги и зачитывает их вам.","Әр қадам ырықсыз етісте. Мұғалім қадамдарды жазып, сізге оқып береді."],
w607:["Не перебивайте на первом круге. Две строки в конце.","Бірінші айналымда бөлмеңіз. Соңында екі жол."],
w608:["1 · Напишите процесс, затем произнесите его вслух.","1 · Процесті жазып, содан кейін дауыстап айтыңыз."],
w609:["Пять-шесть шагов. Каждый шаг в пассиве. Без I и без you.","Бес-алты қадам. Әр қадам ырықсыз етісте. I де, you да жоқ."],
w610:["2 · Проверьте свой текст.","2 · Өз мәтініңізді тексеріңіз."],
w701:["Завершите чек-листом. Назовите повтор: форма -ing вернулась сегодня внутри шагов процесса.","Тексеру тізімімен аяқтаңыз. Қайталауды атаңыз: -ing тұлғасы бүгін процесс қадамдарында қайта кездесті."],
r101:["Прочитайте пять ситуаций. В каких из них вы бы реально сказали что-то официанту?","Бес жағдайды оқыңыз. Қайсысында даяшыға шынымен бірдеңе айтар едіңіз?"],
r102:["Выберите три, затем напишите строку о том, почему промолчали бы об остальных.","Үшеуін таңдап, қалғандары туралы неге үндемейтініңізді бір жолмен жазыңыз."],
r103:["Выберите три, затем скажите преподавателю, о какой вы бы никогда не упомянули.","Үшеуін таңдап, мұғалімге қайсысын ешқашан айтпайтыныңызды айтыңыз."],
r104:["Выберите три, затем сравните с партнёром. Найдите одно расхождение.","Үшеуін таңдап, серіктесіңізбен салыстырыңыз. Бір келіспеушілік табыңыз."],
r105:["Запишите","Жазып алыңыз"],
r106:["Обсудите","Талқылаңыз"],
u10r201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
u10r202:["Показать перевод","Аудармасын көрсету"],
u10r203:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u10r205:["3 · За столом или в отзыве? Распределите слова по колонкам.","3 · Дастарханда ма, әлде пікірде ме? Сөздерді бағандарға бөліңіз."],
u10r206:["Нажмите на слово, затем на колонку.","Сөзді басыңыз, содан кейін бағанды басыңыз."],
u10r207:["4 · Что не так с едой? Выберите правильное слово.","4 · Тағамда не дұрыс емес? Дұрыс сөзді таңдаңыз."],
u10r213:["5 · Работа в парах. В чём проблема?","5 · Жұппен жұмыс. Мәселе неде?"],
u10r214:["Студент A читает проблему с карточки A, не используя ключевое слово. Студент B называет слово. Затем поменяйтесь.","А студент негізгі сөзді қолданбай A картасынан мәселені оқиды. B студент сөзді атайды. Содан соң ауысыңыздар."],
u10r215:["По пять каждому. Описывайте ситуацию, а не слово.","Әрқайсысына бесеу. Сөзді емес, жағдайды сипаттаңыз."],
u10r216:["5 · Опишите проблему преподавателю, не используя ключевое слово.","5 · Негізгі сөзді қолданбай мәселені мұғалімге сипаттаңыз."],
r217:["Преподаватель называет слово. Затем поменяйтесь.","Мұғалім сөзді атайды. Содан соң ауысыңыздар."],
r301:["Прочитайте эти четыре пары. Левое и правое предложение говорят одно и то же.","Мына төрт жұпты оқыңыз. Сол жақтағы және оң жақтағы сөйлем бір нәрсені айтады."],
r302:["Что делают все четыре фразы справа?","Оң жақтағы төрт тіркес не істейді?"],
r303:["Четыре задачи и фразы, которые их решают","Төрт міндет және оларды шешетін тіркестер"],
r304:["Теперь смягчите каждое прямое предложение. Напечатайте недостающие слова.","Енді әр тікелей сөйлемді жұмсартыңыз. Жетіспейтін сөздерді теріңіз."],
r305:["ФОРМА ЖАЛОБЫ. Открыть → смягчить → сказать, что не так → попросить исправить.","ШАҒЫМ ТҰЛҒАСЫ. Ашу → жұмсарту → не дұрыс емесін айту → түзетуді сұрау."],
r306:["ПАССИВ ПОМОГАЕТ. «My fish was overcooked» — жалоба на рыбу. «You overcooked my fish» — жалоба на повара.","ЫРЫҚСЫЗ ЕТІС КӨМЕКТЕСЕДІ. «My fish was overcooked» — балыққа шағым. «You overcooked my fish» — аспазға шағым."],
r307:["Нельзя: «Bring me a cloth», «Would you mind to wait», «You are wrong in the bill».","Болмайды: «Bring me a cloth», «Would you mind to wait», «You are wrong in the bill»."],
r308:["То же смягчение вернётся в Юните 11 для вежливого несогласия.","Дәл сол жұмсарту 11-бөлімде сыпайы келіспеу үшін қайта кездеседі."],
p305:["ФОРМА. У жалобы в английском четыре шага, и они всегда идут в этом порядке: открыть → смягчить → сказать, что не так → попросить исправить. Пропустите первые два — и разумная жалоба прозвучит как нападение.","ТҰЛҒА. Ағылшын тіліндегі шағымда төрт қадам бар және олар әрқашан осы ретпен жүреді: ашу → жұмсарту → не дұрыс емесін айту → түзетуді сұрау. Алғашқы екеуін өткізіп жіберсеңіз, орынды шағым шабуыл болып естіледі."],
p306:["ПОЧЕМУ SEEMS. «There seems to be a mistake» не значит, что вы не уверены. Это значит, что вы даёте собеседнику путь к отступлению.","SEEMS НЕГЕ. «There seems to be a mistake» сенімсіздікті білдірмейді. Бұл әңгімелесушіге шегінер жол қалдыру."],
p307:["WOULD YOU MIND — ЛОВУШКА. После него идёт форма -ing. И ответ перевёрнутый: «Not at all» значит «да, конечно».","WOULD YOU MIND — ТҰЗАҚ. Одан кейін -ing тұлғасы келеді. Жауабы да төңкерілген: «Not at all» — «иә, әрине»."],
p308:["ПАССИВ ДЕЛАЕТ ДИПЛОМАТИЮ. В ресторане и в письменном отзыве вам почти всегда нужен первый вариант.","ЫРЫҚСЫЗ ЕТІС ДИПЛОМАТИЯ ЖАСАЙДЫ. Мейрамханада да, жазбаша пікірде де сізге әрдайым бірінші нұсқа керек."],
p309:["ЧТО ОТВЕЧАЕТ ОФИЦИАНТ. Это понадобится, когда вы возьмёте карточку официанта в ролевой игре.","ДАЯШЫ НЕ ЖАУАП БЕРЕДІ. Рөлдік ойында даяшы картасын алғанда бұл керек болады."],
p310:["Три ошибки: голое повелительное наклонение, «Would you mind to wait», обвинение человека вместо еды.","Үш қате: жалаң бұйрық рай, «Would you mind to wait», тағамның орнына адамды кінәлау."],
p311:["Те же смягчители вернутся в Юните 11 для вежливого несогласия.","Дәл сол жұмсартқыштар 11-бөлімде сыпайы келіспеу үшін қайта кездеседі."],
r310:["Пять фраз из записи. Нажмите Listen и повторите интонацию про себя, не вслух.","Жазбадан бес тіркес. Listen басып, интонацияны дауыстамай ішіңізден қайталаңыз."],
r401:["1 · Клиент или официант? Кто это говорит?","1 · Клиент пе, даяшы ма? Мұны кім айтады?"],
r402:["2 · Соотнесите проблему с естественным ответом.","2 · Мәселені табиғи жауаппен сәйкестендіріңіз."],
r403:["3 · Составьте вежливую жалобу из слов.","3 · Сөздерден сыпайы шағым құрастырыңыз."],
r404:["4 · повтор. Перепишите жалобу так, чтобы она была о еде, а не о человеке.","4 · қайталау. Шағымды адам туралы емес, тағам туралы етіп қайта жазыңыз."],
r405:["Используйте пассив. Напечатайте только часть после стрелки.","Ырықсыз етісті қолданыңыз. Тек көрсеткіден кейінгі бөлікті теріңіз."],
r406:["Проверьте задание 4 вслух и назовите повтор: пассив из Урока 2.","4-тапсырманы дауыстап тексеріп, қайталауды атаңыз: 2-сабақтағы ырықсыз етіс."],
r501:["1 · Прослушайте все пять разговоров. В чём проблема каждый раз?","1 · Бес әңгімені де тыңдаңыз. Әр жолы мәселе неде?"],
r502:["2 · Прослушайте ещё раз и дополните то, что говорящие говорят на самом деле.","2 · Қайта тыңдап, сөйлеушілердің шын айтқанын толықтырыңыз."],
r503:["3 · Десять фраз по отдельности. Прослушайте и решите, кто говорит каждую.","3 · Он тіркес жеке-жеке. Тыңдап, әрқайсысын кім айтатынын шешіңіз."],
r504:["Нажмите на номер, чтобы прослушать фразу снова.","Тіркесті қайта тыңдау үшін нөмірді басыңыз."],
r601:["Теперь изучите модель","Енді үлгіні зерттеңіз"],
r602:["Следующие три задания не о еде. Они о том, КАК построен отзыв — потому что вы построите точно такой же.","Келесі үш тапсырма тағам туралы емес. Олар пікірдің ҚАЛАЙ құрылғаны туралы — өйткені сіз дәл сондай құрасыз."],
r603:["1 · СТРУКТУРА. Какую задачу решает каждый абзац? Расставьте их в порядке появления.","1 · ҚҰРЫЛЫМ. Әр абзац қандай міндет атқарады? Оларды пайда болу ретімен қойыңыз."],
r604:["2 · ПОЛЕЗНЫЕ ФРАЗЫ. Найдите в отзыве фразу, которая делает каждую работу. Напечатайте её.","2 · ПАЙДАЛЫ ТІРКЕСТЕР. Пікірден әр жұмысты істейтін тіркесті табыңыз. Оны теріңіз."],
r605:["Копируйте точно, как в тексте. Эти фразы вы используете в своём отзыве.","Мәтіндегідей дәл көшіріңіз. Бұл тіркестерді өз пікіріңізде қолданасыз."],
r606:["3 · ПАССИВ В ОТЗЫВЕ. повтор. Какой вариант в модели и почему?","3 · ПІКІРДЕГІ ЫРЫҚСЫЗ ЕТІС. қайталау. Үлгіде қай нұсқа және неге?"],
r607:["Оба варианта — правильный английский. Но в честном отзыве уместен только один.","Екі нұсқа да дұрыс ағылшын тілі. Бірақ әділ пікірде тек біреуі орынды."],
r608:["4 · РЕГИСТР. Отзыв — это не жалобное письмо. Какое предложение подходит?","4 · РЕГИСТР. Пікір — шағым хат емес. Қай сөйлем келеді?"],
r701:["1 · Работа в парах. Возьмите по карточке. Не показывайте её.","1 · Жұппен жұмыс. Әрқайсысы бір карта алыңыз. Оны көрсетпеңіз."],
r702:["Каждый знает только свою цель. Откройте, смягчите, назовите проблему, попросите исправить.","Әрқайсысы тек өз мақсатын біледі. Ашыңыз, жұмсартыңыз, мәселені атаңыз, түзетуді сұраңыз."],
r703:["2 · Поменяйтесь ролями и возьмите вторую пару карточек.","2 · Рөлдермен ауысып, екінші жұп картаны алыңыз."],
r704:["Обратная связь только после второго круга. По две строки каждому.","Кері байланыс тек екінші айналымнан кейін. Әрқайсысына екі жол."],
r705:["1 · Вы клиент. Ваш преподаватель — официант.","1 · Сіз клиентсіз. Мұғаліміңіз — даяшы."],
r706:["Вы знаете только свою цель. Откройте, смягчите, назовите проблему, попросите исправить.","Сіз тек өз мақсатыңызды білесіз. Ашыңыз, жұмсартыңыз, мәселені атаңыз, түзетуді сұраңыз."],
r707:["2 · Теперь поменяйтесь. Вы официант, а преподаватель — клиент.","2 · Енді ауысыңыз. Сіз даяшысыз, мұғалім — клиент."],
r708:["Не исправляйте во время разговора. Две строки в конце.","Әңгіме кезінде түзетпеңіз. Соңында екі жол."],
r709:["1 · Ролевая игра вслух.","1 · Рөлдік ойын дауыстап."],
r710:["Прочитайте карточку, затем произнесите обе роли вслух — сначала гость, потом официант.","Картаны оқып, екі рөлді де дауыстап айтыңыз — алдымен қонақ, сосын даяшы."],
r711:["3 · Теперь напишите отзыв — на следующее утро.","3 · Енді пікір жазыңыз — келесі таңертең."],
r712:["120–180 слов, четыре абзаца, точно как в модели: визит → что было хорошо → что пошло не так и что они сделали → ваш вердикт и один совет.","120–180 сөз, төрт абзац, дәл үлгідегідей: бару → не жақсы болды → не дұрыс болмады және олар не істеді → сіздің тұжырымыңыз және бір кеңес."],
r713:["4 · Сверьте с моделью, прежде чем сдавать.","4 · Тапсырмас бұрын үлгімен салыстырыңыз."],
r714:["Собирайте отзывы в конце, не во время. Обратная связь отложенная: по две строки каждому.","Пікірлерді соңында жинаңыз, барысында емес. Кері байланыс кейінге қалдырылады: әрқайсысына екі жол."],
r801:["Завершите чек-листом. Назовите повтор: пассив вернулся сегодня внутри отзыва.","Тексеру тізімімен аяқтаңыз. Қайталауды атаңыз: ырықсыз етіс бүгін пікірде қайта кездесті."],
/* ---- Unit 7 ---- */
u7a101:["Как вы обычно передвигаетесь по городу? Выберите один вариант.","Қалада әдетте қалай жүресіз? Бір нұсқаны таңдаңыз."],
u7a102:["Затем выберите часть поездки, которая нравится меньше всего. Правильного ответа нет.","Содан кейін жол жүрудің ең ұнамайтын бөлігін таңдаңыз. Дұрыс жауап жоқ."],
u7a103:["Сохраните оба ответа. Позже в уроке к каждому из них понадобится причина.","Екі жауапты да сақтаңыз. Сабақтың соңында олардың әрқайсысына себеп керек болады."],
u7a104:["Запишите","Жазып қойыңыз"],
u7a105:["Напишите одно предложение о сегодняшней поездке. Сколько она заняла и была ли она хорошей?","Бүгінгі жолыңыз туралы бір сөйлем жазыңыз. Ол қанша уақыт алды және жақсы болды ма?"],
u7a106:["Узнайте","Біліп алыңыз"],
u7a107:["Спросите трёх человек, как они добрались. Найдите того, у кого дорога была самой длинной.","Үш адамнан қалай жеткенін сұраңыз. Жолы ең ұзақ болған адамды табыңыз."],
u7a108:["Расскажите один ответ: <i>Dana came by bus and it took fifty minutes.</i>","Бір жауапты айтып беріңіз: <i>Dana came by bus and it took fifty minutes.</i>"],
u7a109:["Спросите преподавателя, как он добрался. Чья дорога была длиннее?","Мұғалімнен қалай жеткенін сұраңыз. Кімнің жолы ұзағырақ болды?"],
u7a110:["Скажите одно предложение в ответ: <i>Your journey was longer than mine.</i>","Жауап ретінде бір сөйлем айтыңыз: <i>Your journey was longer than mine.</i>"],
u7a201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
u7a202:["Показать перевод","Аудармасын көрсету"],
u7a203:["3 · Соедините каждое слово с его значением.","3 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u7a204:["4 · Деньги, дорога или двигатель? Определите каждое слово в свою группу.","4 · Ақша, жол әлде қозғалтқыш па? Әр сөзді өз тобына орналастырыңыз."],
u7a205:["Два слова почти подходят в две группы. Выберите ту, о чём слово на самом деле.","Екі сөз екі топқа да келеді. Сөз шын мәнінде не туралы екенін таңдаңыз."],
u7a206:["5 · В каждой группе одно слово лишнее. Нажмите на него.","5 · Әр топта бір сөз артық. Соны басыңыз."],
u7a207:["6 · Какое слово с каким сочетается? Выберите естественную пару.","6 · Қай сөз қайсысымен тіркеседі? Табиғи жұпты таңдаңыз."],
u7a208:["7 · Дополните предложения. Не подглядывайте в карточки.","7 · Сөйлемдерді толықтырыңыз. Карталарға қарамаңыз."],
u7a209:["По одному слову в каждый пропуск.","Әр бос орынға бір сөзден."],
u7a301:["Прочитайте эти четыре предложения из текста, который вы будете читать.","Оқитын мәтіннен алынған осы төрт сөйлемді оқыңыз."],
u7a302:["В двух предложениях автор уверен, в двух других — нет. Какое слово показывает, что автор <i>не</i> уверен?","Екі сөйлемде автор сенімді, екеуінде — жоқ. Автордың сенімді <i>емес</i> екенін қай сөз көрсетеді?"],
u7a303:["Насколько вы уверены?","Қаншалықты сенімдісіз?"],
u7a304:["<b>ЗНАЧЕНИЕ.</b> <i>Will</i> — прогноз, в котором вы уверены. <i>Might</i> — прогноз, в котором вы не уверены, примерно пятьдесят на пятьдесят.","<b>МАҒЫНАСЫ.</b> <i>Will</i> — сенімді болжам. <i>Might</i> — сенімсіз болжам, шамамен елу елу."],
u7a305:["<b>ФОРМА.</b> Оба берут глагол в начальной форме: <i>it will rain</i>, <i>it might rain</i>. Никогда <i>will to rain</i> и никогда <i>it might rains</i>.","<b>ФОРМАСЫ.</b> Екеуі де етістіктің бастапқы түрін алады: <i>it will rain</i>, <i>it might rain</i>. Ешқашан <i>will to rain</i> немесе <i>it might rains</i> емес."],
u7a306:["Ошибка, за которой стоит следить: у <i>might not</i> нет краткой формы в аккуратном письме. Пишите <i>might not</i>, а не <i>mightn’t</i>.","Байқау керек қате: ұқыпты жазуда <i>might not</i> қысқа түрі жоқ. <i>Mightn’t</i> емес, <i>might not</i> деп жазыңыз."],
u7a307:["<b>ЗНАЧЕНИЕ.</b> Используйте <i>will</i>, когда уверены в будущем: <i>Electric buses will be normal in ten years.</i> Используйте <i>might</i>, когда это лишь возможно: <i>Flying taxis might arrive one day.</i>","<b>МАҒЫНАСЫ.</b> Болашаққа сенімді болсаңыз <i>will</i> қолданыңыз: <i>Electric buses will be normal in ten years.</i> Тек мүмкін болса — <i>might</i>: <i>Flying taxis might arrive one day.</i>"],
u7a308:["<b>ФОРМА.</b> <i>will</i> / <i>won’t</i> / <i>might</i> / <i>might not</i> + глагол в начальной форме. Глагол не меняется: <i>he will go</i>, а не <i>he will goes</i>; <i>it might rain</i>, а не <i>it might to rain</i>.","<b>ФОРМАСЫ.</b> <i>will</i> / <i>won’t</i> / <i>might</i> / <i>might not</i> + бастапқы етістік. Етістік өзгермейді: <i>he will goes</i> емес <i>he will go</i>; <i>it might to rain</i> емес <i>it might rain</i>."],
u7a309:["<b>СМЯГЧЕНИЕ.</b> Носители языка редко звучат на сто процентов уверенно. <i>I think… will</i>, <i>probably will</i> и <i>probably won’t</i> стоят между <i>will</i> и <i>might</i>.","<b>ЖҰМСАРТУ.</b> Ағылшын тілінде сирек жүз пайыз сенімді сөйлейді. <i>I think… will</i>, <i>probably will</i> және <i>probably won’t</i> — <i>will</i> мен <i>might</i> арасында."],
u7a310:["Две ошибки: <i>might</i> не используется в вопросах (говорите <i>Will fares go up?</i>), и <i>might not</i> пишется полностью, а не как <i>mightn’t</i>.","Екі қате: <i>might</i> сұрақта қолданылмайды (<i>Will fares go up?</i> деңіз), және <i>might not</i> толық жазылады, <i>mightn’t</i> емес."],
u7a311:["Это не единственное будущее, которое вы знаете. <i>Going to</i> и Present Continuous из Unit 4 — для планов и договорённостей. <i>Will</i> и <i>might</i> — для прогнозов. В уроке 25 <i>will</i> вернётся внутри первого условного.","Бұл сіз білетін жалғыз болашақ емес. 4-бөлімдегі <i>going to</i> мен Present Continuous — жоспар мен келісім үшін. <i>Will</i> мен <i>might</i> — болжам үшін. 25-сабақта <i>will</i> бірінші шартты сөйлемде оралады."],
u7a312:["Теперь расставьте эти пять прогнозов от самого уверенного до самого неуверенного.","Енді осы бес болжамды ең сенімдіден ең сенімсізге қарай орналастырыңыз."],
u7a313:["Пять прогнозов из текста. Прочитайте каждый и решите: уверенно или возможно?","Мәтіннен бес болжам. Әрқайсысын оқып шешіңіз: сенімді ме, әлде мүмкін бе?"],
u7a401:["1 · Выберите правильную форму.","1 · Дұрыс формасын таңдаңыз."],
u7a402:["2 · Составьте прогноз из слов.","2 · Сөздерден болжам құрастырыңыз."],
u7a403:["Нажимайте на слова по очереди. Нажмите на слово ещё раз, чтобы вернуть его.","Сөздерді кезекпен басыңыз. Қайтару үшін сөзді қайта басыңыз."],
u7a404:["3 · Перепишите предложение со словом в скобках. Сохраните смысл.","3 · Жақшадағы сөзбен сөйлемді қайта жазыңыз. Мағынасын сақтаңыз."],
u7a405:["4 · В каждом предложении одно лишнее слово. Нажмите на него.","4 · Әр сөйлемде бір артық сөз бар. Соны басыңыз."],
u7a406:["Сначала прочитайте всё предложение, затем нажмите на единственное слово, которого там быть не должно.","Алдымен бүкіл сөйлемді оқыңыз, содан кейін артық жалғыз сөзді басыңыз."],
u7a407:["5 · <span class=\"pill-rec\">повторение</span> Present Perfect или Past Simple? Выберите правильную форму.","5 · <span class=\"pill-rec\">қайталау</span> Present Perfect па әлде Past Simple бе? Дұрыс форманы таңдаңыз."],
u7a408:["Ищите слово, указывающее на завершённое время. Если оно есть — нужен Past Simple.","Аяқталған уақытты білдіретін сөзді іздеңіз. Ол болса — Past Simple керек."],
u7a409:["Дополнительная отработка","Қосымша жаттығу"],
u7a410:["Дополните каждое предложение словом <i>will</i>, <i>won’t</i>, <i>might</i> или <i>might not</i>. Иногда возможно несколько вариантов — выберите тот, который требует значение в скобках.","Әр сөйлемді <i>will</i>, <i>won’t</i>, <i>might</i> немесе <i>might not</i> сөзімен толықтырыңыз. Кейде бірнеше нұсқа мүмкін — жақшадағы мағынаға сәйкесін таңдаңыз."],
u7a501:["Перед чтением: что из этого, по-вашему, станет обычным в вашем городе через двадцать лет?","Оқу алдында: осылардың қайсысы жиырма жылдан кейін қалаңызда әдеттегі жағдай болады деп ойлайсыз?"],
u7a502:["Выберите два варианта. Затем прочитайте и проверьте, согласен ли текст с вами.","Екі нұсқаны таңдаңыз. Содан кейін оқып, мәтін сізбен келісе ме, тексеріңіз."],
u7a503:["Правильного ответа пока нет. Это ваш прогноз.","Әзірге дұрыс жауап жоқ. Бұл — сіздің болжамыңыз."],
u7a504:["1 · Прочитайте текст один раз. Подберите заголовок к каждому абзацу.","1 · Мәтінді бір рет оқыңыз. Әр абзацқа тақырып таңдаңыз."],
u7a505:["2 · Прочитайте ещё раз. Верно или неверно?","2 · Тағы бір оқыңыз. Дұрыс па, бұрыс па?"],
u7a506:["3 · Ответьте, используя информацию из текста.","3 · Мәтіндегі ақпаратты пайдаланып жауап беріңіз."],
u7a507:["4 · Найдите в тексте слово, которое означает…","4 · Мәтіннен мына мағынадағы сөзді табыңыз…"],
u7a508:["5 · Посмотрите на предложения из текста. Автор уверен или это лишь возможно?","5 · Мәтіндегі сөйлемдерге қараңыз. Автор сенімді ме, әлде бұл тек мүмкін бе?"],
u7a601:["Послушайте. Kazimierz ездит на автобусе, Elise на поезде, Aldo на велосипеде. Кто что говорит?","Тыңдаңыз. Kazimierz автобуспен, Elise пойызбен, Aldo велосипедпен жүреді. Кім не айтады?"],
u7a602:["Нажмите на имя, чтобы прослушать только этого человека ещё раз.","Тек сол адамды қайта тыңдау үшін есімді басыңыз."],
u7a701:["Полезные фразы","Пайдалы сөз тіркестері"],
u7a702:["1 · Работа в парах. Сделайте пять прогнозов о транспорте в вашем городе в 2045 году.","1 · Жұппен жұмыс. 2045 жылғы қалаңыздың көлігі туралы бес болжам жасаңыз."],
u7a703:["Используйте <i>will</i> для того, в чём уверены, и <i>might</i> для того, в чём нет. Минимум два прогноза должны быть с <i>might</i>.","Сенімді болсаңыз <i>will</i>, сенімсіз болсаңыз <i>might</i> қолданыңыз. Кемінде екі болжам <i>might</i> арқылы болуы керек."],
u7a704:["2 · Работа в парах. Прочитайте прогнозы партнёра и скажите, насколько вы уверены.","2 · Жұппен жұмыс. Серіктесіңіздің болжамдарын оқып, қаншалықты сенімді екеніңізді айтыңыз."],
u7a705:["Отвечайте на каждый прогноз одной из фраз: <i>I agree, that will definitely happen</i> · <i>It might happen</i> · <i>I’m not so sure — I think it probably won’t</i>.","Әр болжамға мына тіркестердің бірімен жауап беріңіз: <i>I agree, that will definitely happen</i> · <i>It might happen</i> · <i>I’m not so sure — I think it probably won’t</i>."],
u7a706:["Преподавателю","Мұғалімге"],
u7a707:["Обратная связь после задания: возьмите один прогноз, где <i>might</i> использован хорошо, и одно предложение, которое стоит переделать. Не исправляйте во время задания.","Тапсырмадан кейінгі кері байланыс: <i>might</i> жақсы қолданылған бір болжамды және қайта жасауға тұрарлық бір сөйлемді алыңыз. Тапсырма кезінде түзетпеңіз."],
u7a708:["1 · Работа с преподавателем. Сделайте пять прогнозов о транспорте в вашем городе в 2045 году.","1 · Мұғаліммен жұмыс. 2045 жылғы қалаңыздың көлігі туралы бес болжам жасаңыз."],
u7a709:["Используйте <i>will</i> для того, в чём уверены, и <i>might</i> для того, в чём нет. Минимум два прогноза с <i>might</i>.","Сенімді болсаңыз <i>will</i>, сенімсіз болсаңыз <i>might</i> қолданыңыз. Кемінде екеуі <i>might</i> арқылы."],
u7a710:["2 · Расскажите преподавателю свои прогнозы и послушайте, насколько он в них уверен.","2 · Мұғалімге болжамдарыңызды айтып, оның қаншалықты сенімді екенін тыңдаңыз."],
u7a711:["Проверяйте после, а не во время: один прогноз, где <i>might</i> использован хорошо, и одно предложение, которое стоит переделать.","Тапсырма кезінде емес, кейін тексеріңіз: <i>might</i> жақсы қолданылған бір болжам және қайта жасайтын бір сөйлем."],
u7a712:["1 · Напишите пять прогнозов о транспорте в вашем городе в 2045 году.","1 · 2045 жылғы қалаңыздың көлігі туралы бес болжам жазыңыз."],
u7a713:["Используйте <i>will</i> для того, в чём уверены, и <i>might</i> для того, в чём нет. Минимум два прогноза с <i>might</i>.","Сенімді болсаңыз <i>will</i>, сенімсіз болсаңыз <i>might</i> қолданыңыз. Кемінде екеуі <i>might</i> арқылы."],
u7a714:["2 · Теперь те же пять идей, но про село, а не про город.","2 · Енді сол бес идея, бірақ қала емес, ауыл туралы."],
u7a715:["Сохраните оба поля. Вы возьмёте их в устное задание ниже.","Екі өрісті де сақтаңыз. Оларды төмендегі ауызша тапсырмаға аласыз."],
u7a801:["Отметьте всё, что вы уже умеете.","Меңгергеніңіздің бәрін белгілеңіз."],
u7a802:["Преподавателю","Мұғалімге"],
u7a803:["Завершите уроком-чеклистом. Скажите вслух, что сегодня вернулся Present Perfect — в упражнении 5 и внутри текста. Ученики должны услышать, что это повторение. Укажите вперёд: <i>will</i> вернётся в уроке 25 в первом условном.","Сабақты чек-парақпен аяқтаңыз. Бүгін Present Perfect оралғанын дауыстап айтыңыз — 5-жаттығуда және мәтін ішінде. Оқушылар мұның қайталау екенін естуі керек. Алға нұсқаңыз: <i>will</i> 25-сабақта бірінші шартты сөйлемде оралады."],
u7b101:["Соедините каждого путешественника с местом, которое он бы выбрал.","Әр саяхатшыны таңдайтын орнымен сәйкестендіріңіз."],
u7b102:["Правильного ответа здесь нет — выберите то, что кажется подходящим.","Мұнда дұрыс жауап жоқ — өзіңізге сәйкес келетінін таңдаңыз."],
u7b103:["Теперь подумайте о себе. Что бы выбрали вы и почему?","Енді өзіңіз туралы ойлаңыз. Сіз нені таңдар едіңіз және неге?"],
u7b104:["Запишите","Жазып қойыңыз"],
u7b105:["Напишите два предложения: самое лучшее место, где вы останавливались, и самое худшее.","Екі сөйлем жазыңыз: тұрған ең жақсы орын және ең нашары."],
u7b106:["Узнайте","Біліп алыңыз"],
u7b107:["Спросите двух человек о худшем месте, где они останавливались. Что там было не так?","Екі адамнан тұрған ең нашар орны туралы сұраңыз. Онда не дұрыс болмады?"],
u7b108:["Расскажите один ответ классу одним предложением.","Бір жауапты сыныпқа бір сөйлеммен айтып беріңіз."],
u7b109:["Спросите преподавателя о худшем месте, где он останавливался. Что там было не так?","Мұғалімнен тұрған ең нашар орны туралы сұраңыз. Онда не дұрыс болмады?"],
u7b110:["Скажите одно предложение в ответ: <i>Your worst place sounds worse than mine.</i>","Жауап ретінде бір сөйлем айтыңыз: <i>Your worst place sounds worse than mine.</i>"],
u7b201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
u7b202:["Показать перевод","Аудармасын көрсету"],
u7b203:["3 · Соедините каждое слово с его значением.","3 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u7b204:["4 · До поездки или после приезда? Определите каждое действие в свою группу.","4 · Сапарға дейін бе, әлде келгеннен кейін бе? Әр әрекетті өз тобына орналастырыңыз."],
u7b205:["<b>-ed или -ing?</b> Прилагательное на <i>-ing</i> описывает <b>вещь</b>: <i>the museum was fascinating</i>. Прилагательное на <i>-ed</i> описывает <b>человека</b>, который это чувствует: <i>I was fascinated</i>. Если вы скажете <i>I am boring</i>, вы только что сообщили всем, что вы скучный человек.","<b>-ed пе әлде -ing пе?</b> <i>-ing</i> сын есімі <b>затты</b> сипаттайды: <i>the museum was fascinating</i>. <i>-ed</i> сын есімі оны <b>сезінетін адамды</b> сипаттайды: <i>I was fascinated</i>. <i>I am boring</i> десеңіз, өзіңізді жалықтыратын адам деп жариялайсыз."],
u7b206:["5 · Выберите правильную форму.","5 · Дұрыс форманы таңдаңыз."],
u7b207:["6 · Какое слово с каким сочетается?","6 · Қай сөз қайсысымен тіркеседі?"],
u7b208:["7 · Дополните предложения. Не подглядывайте в карточки.","7 · Сөйлемдерді толықтырыңыз. Карталарға қарамаңыз."],
u7b301:["Прочитайте эти четыре предложения из записи.","Жазбадан алынған осы төрт сөйлемді оқыңыз."],
u7b302:["Одно из четырёх предложений отрицательное. Какое начало в нём используется?","Төрт сөйлемнің бірі болымсыз. Онда қандай бастама қолданылған?"],
u7b303:["Сначала выберите начало, потом окончание","Алдымен бастамасын, содан кейін жалғауын таңдаңыз"],
u7b304:["<b>ПРАВИЛО.</b> <i>Some-</i> в утвердительных предложениях, <i>any-</i> в отрицаниях и вопросах. <i>No-</i> уже отрицательное, поэтому глагол остаётся положительным.","<b>ЕРЕЖЕ.</b> <i>Some-</i> болымды сөйлемде, <i>any-</i> болымсыз бен сұрақта. <i>No-</i> өзі болымсыз, сондықтан етістік болымды күйде қалады."],
u7b305:["<b>ФОРМА.</b> Глагол после этих слов всегда в единственном числе: <i>everybody knows</i>, <i>nothing is open</i>.","<b>ФОРМАСЫ.</b> Бұл сөздерден кейінгі етістік әрқашан жекеше: <i>everybody knows</i>, <i>nothing is open</i>."],
u7b306:["Ошибка, за которой стоит следить: <i>I didn’t see nobody</i>. Одного отрицания достаточно — <i>I didn’t see anybody</i> или <i>I saw nobody</i>.","Байқау керек қате: <i>I didn’t see nobody</i>. Бір болымсыздық жеткілікті — <i>I didn’t see anybody</i> немесе <i>I saw nobody</i>."],
u7b307:["<b>ПРАВИЛО.</b> Используйте <i>some-</i> в утвердительных предложениях: <i>There is something in my bag.</i> Используйте <i>any-</i> в отрицаниях и вопросах: <i>Is there anything in my bag?</i> / <i>There isn’t anything in my bag.</i>","<b>ЕРЕЖЕ.</b> Болымды сөйлемде <i>some-</i>: <i>There is something in my bag.</i> Болымсыз бен сұрақта <i>any-</i>: <i>Is there anything in my bag?</i> / <i>There isn’t anything in my bag.</i>"],
u7b308:["<b>NO- УЖЕ ОТРИЦАТЕЛЬНОЕ.</b> <i>There is nothing in my bag</i> значит то же, что <i>There isn’t anything in my bag</i>. Используйте одно отрицание, а не два.","<b>NO- ӨЗІ БОЛЫМСЫЗ.</b> <i>There is nothing in my bag</i> — <i>There isn’t anything in my bag</i> дегенмен бірдей. Екі емес, бір болымсыздық қолданыңыз."],
u7b309:["<b>ЕДИНСТВЕННОЕ ЧИСЛО.</b> <i>Everyone is here.</i> <i>Nobody knows.</i> <i>Nothing works.</i> Слово выглядит как множественное, но глагол в единственном числе. Чтобы сослаться назад, английский использует <i>their</i>: <i>Everyone leaves their shoes outside.</i>","<b>ЖЕКЕШЕ ТҮР.</b> <i>Everyone is here.</i> <i>Nobody knows.</i> <i>Nothing works.</i> Сөз көпше сияқты көрінеді, бірақ етістік жекеше. Кері сілтеу үшін ағылшын тілі <i>their</i> қолданады: <i>Everyone leaves their shoes outside.</i>"],
u7b310:["<b>ПОРЯДОК СЛОВ.</b> Прилагательное идёт после: <i>somewhere hot</i>, <i>something cheap</i>, <i>nothing interesting</i>.","<b>СӨЗ ТӘРТІБІ.</b> Сын есім кейін тұрады: <i>somewhere hot</i>, <i>something cheap</i>, <i>nothing interesting</i>."],
u7b311:["Две ошибки: <i>I didn’t see nobody</i> (два отрицания) и <i>everyone are ready</i> (множественный глагол).","Екі қате: <i>I didn’t see nobody</i> (екі болымсыздық) және <i>everyone are ready</i> (көпше етістік)."],
u7b312:["Вы встретите эти слова снова в уроке 21, где они понадобятся, чтобы описать, что не так в номере отеля.","Бұл сөздерді 21-сабақта қайта кездестіресіз — қонақүй нөмірінде не дұрыс емес екенін сипаттау үшін."],
u7b313:["Слушайте и читайте. Пять предложений из записи, по одному.","Тыңдап оқыңыз. Жазбадан бес сөйлем, бір-бірден."],
u7b314:["Navigate B1 · Audio 7.5 — слова самого говорящего.","Navigate B1 · Audio 7.5 — сөйлеушінің өз сөздері."],
u7b315:["Послушайте шесть предложений ещё раз. Какое слово вы слышите?","Алты сөйлемді тағы бір тыңдаңыз. Қай сөзді естисіз?"],
u7b316:["В обычной речи эти слова безударные и быстрые. Прослушайте каждое дважды, прежде чем выбирать.","Қалыпты сөйлеуде бұл сөздер екпінсіз әрі жылдам. Таңдау алдында әрқайсысын екі рет тыңдаңыз."],
u7b401:["1 · Выберите правильное слово.","1 · Дұрыс сөзді таңдаңыз."],
u7b402:["2 · Дополните диалог. По одному слову в каждый пропуск.","2 · Диалогты толықтырыңыз. Әр бос орынға бір сөзден."],
u7b403:["3 · В каждом предложении одно лишнее слово. Нажмите на него.","3 · Әр сөйлемде бір артық сөз бар. Соны басыңыз."],
u7b404:["4 · Перепишите предложение так, чтобы смысл остался тем же.","4 · Мағынасы сол қалпында қалатындай етіп сөйлемді қайта жазыңыз."],
u7b405:["5 · <span class=\"pill-rec\">повторение</span> Уверенно или возможно? Дополните словами <i>will</i>, <i>won’t</i>, <i>might</i> или <i>might not</i>.","5 · <span class=\"pill-rec\">қайталау</span> Сенімді ме, әлде мүмкін бе? <i>will</i>, <i>won’t</i>, <i>might</i> немесе <i>might not</i> сөздерімен толықтырыңыз."],
u7b406:["Дополнительная отработка","Қосымша жаттығу"],
u7b407:["Дополните каждое предложение одним словом. Посмотрите, утвердительное это предложение, отрицательное или вопрос.","Әр сөйлемді бір сөзбен толықтырыңыз. Сөйлемнің болымды, болымсыз әлде сұраулы екенін қараңыз."],
u7b501:["Перед прослушиванием: <i>Manga Kissa</i> — это японское кафе. Как вы думаете, что там можно делать?","Тыңдау алдында: <i>Manga Kissa</i> — жапондық кафе. Онда не істеуге болады деп ойлайсыз?"],
u7b502:["Выберите сколько угодно вариантов. Затем послушайте и проверьте.","Қалағаныңызша нұсқа таңдаңыз. Содан кейін тыңдап тексеріңіз."],
u7b503:["Правильного ответа пока нет. Это ваш прогноз.","Әзірге дұрыс жауап жоқ. Бұл — сіздің болжамыңыз."],
u7b504:["1 · Прослушайте всю запись один раз. Ответьте на два вопроса.","1 · Бүкіл жазбаны бір рет тыңдаңыз. Екі сұраққа жауап беріңіз."],
u7b505:["2 · Прослушайте часть 1 ещё раз, снаружи кафе. Верно или неверно?","2 · Кафенің сыртындағы 1-бөлікті тағы тыңдаңыз. Дұрыс па, бұрыс па?"],
u7b506:["3 · Прослушайте части 2 и 3 ещё раз. Дополните заметки одним-двумя словами.","3 · 2 және 3-бөліктерді тағы тыңдаңыз. Жазбаларды бір-екі сөзбен толықтырыңыз."],
u7b507:["4 · Какие именно слова использовал говорящий? Выберите.","4 · Сөйлеуші дәл қандай сөздерді қолданды? Таңдаңыз."],
u7b508:["5 · Два вопроса для обсуждения.","5 · Талқылауға арналған екі сұрақ."],
u7b509:["Ответьте в парах, затем возьмите два ответа от класса. / Ответьте, затем задайте те же два вопроса преподавателю. / Ответьте на оба письменно, по два-три предложения на каждый.","Жұппен жауап беріңіз, содан кейін сыныптан екі жауап алыңыз. / Жауап беріп, сол екі сұрақты мұғалімге қойыңыз. / Екеуіне де жазбаша, әрқайсысына екі-үш сөйлемнен жауап беріңіз."],
u7b601:["Полезные фразы","Пайдалы сөз тіркестері"],
u7b602:["1 · Работа втроём. Прочитайте только свою карточку. Не показывайте её другим.","1 · Үшеу болып жұмыс. Тек өз картаңызды оқыңыз. Оны басқаларға көрсетпеңіз."],
u7b603:["2 · Работа втроём. Договоритесь об одном отпуске на всех троих.","2 · Үшеу болып жұмыс. Үшеуіне ортақ бір демалыс туралы келісіңіз."],
u7b604:["Нужно выбрать одно место, один тип жилья и один способ добраться. Используйте минимум четыре выражения из блока полезных фраз.","Бір орын, бір баспана түрі және бір жол жүру тәсілін таңдау керек. Пайдалы тіркестер блогынан кемінде төртеуін қолданыңыз."],
u7b605:["3 · Работа в парах с человеком из другой группы. Сравните ваши отпуска.","3 · Басқа топтағы адаммен жұппен жұмыс. Демалыстарыңызды салыстырыңыз."],
u7b606:["Скажите одну вещь, которая есть у вашего отпуска и которой нет у их: <i>There’s nowhere to swim on your holiday.</i>","Сіздің демалысыңызда бар, ал оларда жоқ бір нәрсені айтыңыз: <i>There’s nowhere to swim on your holiday.</i>"],
u7b607:["Преподавателю","Мұғалімге"],
u7b608:["Обратная связь после задания: одно хорошо использованное неопределённое местоимение и одно, которое стоит переделать. Слушайте, не появляется ли <i>everyone are</i> и двойные отрицания — отметьте их, но не перебивайте.","Тапсырмадан кейінгі кері байланыс: жақсы қолданылған бір белгісіздік есімдігі және қайта жасауға тұрарлық біреуі. <i>Everyone are</i> мен қос болымсыздықты байқаңыз — белгілеп қойыңыз, бірақ бөлмеңіз."],
u7b609:["1 · Прочитайте свою карточку. У преподавателя другая.","1 · Өз картаңызды оқыңыз. Мұғалімде басқасы бар."],
u7b610:["2 · Работа с преподавателем. Договоритесь об одном отпуске на двоих.","2 · Мұғаліммен жұмыс. Екеуіне ортақ бір демалыс туралы келісіңіз."],
u7b611:["3 · Теперь поменяйтесь карточками с преподавателем и повторите с другим отпуском.","3 · Енді мұғаліммен карталарды ауыстырып, басқа демалыспен қайталаңыз."],
u7b612:["Второй раз — самый важный: язык, который нужен, вы уже знаете.","Екінші рет — ең маңыздысы: қажетті тілді енді білесіз."],
u7b613:["Проверяйте после, а не во время: одно хорошо использованное неопределённое местоимение и одно, которое стоит переделать.","Тапсырма кезінде емес, кейін тексеріңіз: жақсы қолданылған бір белгісіздік есімдігі және қайта жасайтын біреуі."],
u7b614:["1 · Прочитайте про трёх путешественников. Выберите один отпуск, который подойдёт всем.","1 · Үш саяхатшы туралы оқыңыз. Барлығына жарайтын бір демалысты таңдаңыз."],
u7b615:["Напишите от шестидесяти до восьмидесяти слов. Используйте минимум четыре неопределённых местоимения и скажите, что каждый получит наверняка и что — возможно.","Алпыстан сексен сөзге дейін жазыңыз. Кемінде төрт белгісіздік есімдігін қолданып, әркім не алатынын және не мүмкін екенін айтыңыз."],
u7b616:["2 · Теперь напишите об отпуске, который выбрали бы вы сами.","2 · Енді өзіңіз таңдайтын демалыс туралы жазыңыз."],
u7b617:["Сохраните оба поля. Вы возьмёте их в устное задание ниже.","Екі өрісті де сақтаңыз. Оларды төмендегі ауызша тапсырмаға аласыз."],
u7b701:["Отметьте всё, что вы уже умеете.","Меңгергеніңіздің бәрін белгілеңіз."],
u7b702:["Преподавателю","Мұғалімге"],
u7b703:["Завершите уроком-чеклистом. Скажите вслух, что сегодня вернулись <i>will</i> и <i>might</i> — в упражнении 5 и внутри задания на планирование. Укажите вперёд: эти местоимения вернутся в уроке 21, чтобы описать, что не так в номере отеля.","Сабақты чек-парақпен аяқтаңыз. Бүгін <i>will</i> мен <i>might</i> оралғанын дауыстап айтыңыз — 5-жаттығуда және жоспарлау тапсырмасында. Алға нұсқаңыз: бұл есімдіктер 21-сабақта қонақүй нөмірінің кемшіліктерін сипаттау үшін оралады."],
u7c101:["Расставьте эти пять этапов в том порядке, в котором они обычно происходят в отеле.","Осы бес кезеңді қонақүйде әдетте болатын ретімен орналастырыңыз."],
u7c102:["Нажимайте на карточки по очереди. Нажмите ещё раз, чтобы вернуть карточку.","Карталарды кезекпен басыңыз. Қайтару үшін қайта басыңыз."],
u7c103:["Запишите","Жазып қойыңыз"],
u7c104:["Вспомните отель, хостел или квартиру, где вы останавливались. Напишите два предложения: что было хорошо и что было не так.","Тұрған қонақүй, хостел немесе пәтерді еске түсіріңіз. Екі сөйлем жазыңыз: не жақсы болды және не дұрыс болмады."],
u7c105:["Узнайте","Біліп алыңыз"],
u7c106:["Спросите двух человек о последнем месте, где они останавливались. Что было не так с номером?","Екі адамнан соңғы тұрған орны туралы сұраңыз. Нөмірде не дұрыс болмады?"],
u7c107:["Расскажите классу самый плохой ответ одним предложением.","Ең нашар жауапты сыныпқа бір сөйлеммен айтып беріңіз."],
u7c108:["Спросите преподавателя о последнем месте, где он останавливался. Что было не так с номером?","Мұғалімнен соңғы тұрған орны туралы сұраңыз. Нөмірде не дұрыс болмады?"],
u7c109:["Скажите одно предложение в ответ: <i>That sounds worse than my last hotel.</i>","Жауап ретінде бір сөйлем айтыңыз: <i>That sounds worse than my last hotel.</i>"],
u7c201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
u7c202:["Показать перевод","Аудармасын көрсету"],
u7c203:["3 · Соедините каждое слово с его значением.","3 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u7c204:["4 · Кто это говорит — гость или администратор?","4 · Мұны кім айтады — қонақ па әлде әкімші ме?"],
u7c205:["5 · В каждой группе одно слово лишнее. Нажмите на него.","5 · Әр топта бір сөз артық. Соны басыңыз."],
u7c206:["6 · Дополните предложения. По одному слову в каждый пропуск.","6 · Сөйлемдерді толықтырыңыз. Әр бос орынға бір сөзден."],
u7c301:["Прочитайте эти четыре реплики из записи.","Жазбадан алынған осы төрт репликаны оқыңыз."],
u7c302:["Во второй и третьей репликах — кто выполняет действие?","Екінші және үшінші репликада әрекетті кім орындайды?"],
u7c303:["Что именно вам нужно?","Сізге не керек?"],
u7c304:["<b>ВЫБОР.</b> <i>Could you…?</i> просит другого человека что-то сделать. <i>Could I…?</i> просит разрешения или вещь. Оба берут глагол без <i>to</i>.","<b>ТАҢДАУ.</b> <i>Could you…?</i> басқа адамнан бірдеңе істеуін сұрайды. <i>Could I…?</i> рұқсат немесе зат сұрайды. Екеуі де <i>to</i>-сыз етістік алады."],
u7c305:["<b>ПОЧЕМУ ЭТО ВАЖНО.</b> <i>Give me a spare key</i> — грамматически правильный английский, который звучит грубо. <i>Could I have a spare key, please?</i> — та же просьба, но вежливо.","<b>НЕЛІКТЕН МАҢЫЗДЫ.</b> <i>Give me a spare key</i> — грамматикасы дұрыс, бірақ дөрекі естіледі. <i>Could I have a spare key, please?</i> — сол өтініш, бірақ сыпайы."],
u7c306:["Ошибка, за которой стоит следить: <i>Could you to send someone up?</i> После <i>could</i> частицы <i>to</i> нет.","Байқау керек қате: <i>Could you to send someone up?</i> <i>Could</i> сөзінен кейін <i>to</i> болмайды."],
u7c307:["<b>ВЫБОР.</b> <i>Could you…?</i> просит другого человека что-то сделать: <i>Could you send someone up?</i> <i>Could I…?</i> просит вещь или разрешение: <i>Could I have a spare key?</i>","<b>ТАҢДАУ.</b> <i>Could you…?</i> басқа адамнан әрекет сұрайды: <i>Could you send someone up?</i> <i>Could I…?</i> зат немесе рұқсат сұрайды: <i>Could I have a spare key?</i>"],
u7c308:["<b>ФОРМА.</b> После <i>could</i> идёт глагол в начальной форме, без <i>to</i> и без <i>-s</i>: <i>Could you send…</i>, а не <i>Could you to send…</i> или <i>Could he sends…</i>","<b>ФОРМАСЫ.</b> <i>Could</i> сөзінен кейін етістік бастапқы түрде, <i>to</i>-сыз және <i>-s</i>-сыз: <i>Could you send…</i>, <i>Could you to send…</i> немесе <i>Could he sends…</i> емес."],
u7c309:["<b>СМЯГЧИТЕЛИ.</b> <i>Please</i> обычно ставится в конце. <i>Just</i> делает просьбу меньше: <i>Could I just check one thing?</i> <i>Possibly</i> делает её осторожнее: <i>Could you possibly bring me a towel?</i>","<b>ЖҰМСАРТҚЫШТАР.</b> <i>Please</i> әдетте соңында тұрады. <i>Just</i> өтінішті кішірейтеді: <i>Could I just check one thing?</i> <i>Possibly</i> оны сақтық танытады: <i>Could you possibly bring me a towel?</i>"],
u7c310:["<b>ОТВЕТЫ.</b> Yes, of course. · Certainly. · I’m afraid not. · I’m afraid the room isn’t ready yet. Администратор в записи использует <i>I’m afraid</i>, чтобы мягко сообщить плохую новость.","<b>ЖАУАПТАР.</b> Yes, of course. · Certainly. · I’m afraid not. · I’m afraid the room isn’t ready yet. Жазбадағы әкімші жаман жаңалықты жұмсақ жеткізу үшін <i>I’m afraid</i> қолданады."],
u7c311:["Две ошибки: <i>Could you to help me?</i> (нет <i>to</i>) и голое повелительное — <i>Bring me a towel</i> — грамматически верное и социально неуместное.","Екі қате: <i>Could you to help me?</i> (<i>to</i> жоқ) және жалаң бұйрық райы — <i>Bring me a towel</i> — грамматикасы дұрыс, бірақ әлеуметтік тұрғыдан орынсыз."],
u7c312:["Вы уже умеете говорить о возможном: <i>might</i> из урока 19 — это то, что использует администратор, когда не может пообещать. <i>The room might be ready by one.</i>","Мүмкіндік туралы айтуды білесіз: 19-сабақтағы <i>might</i> — әкімші уәде бере алмағанда қолданатын сөз. <i>The room might be ready by one.</i>"],
u7c313:["Слушайте и читайте. Пять фраз из записи, по одной.","Тыңдап оқыңыз. Жазбадан бес тіркес, бір-бірден."],
u7c314:["Navigate B1 · Audio 7.7 — фразы голосами самих говорящих.","Navigate B1 · Audio 7.7 — сөйлеушілердің өз дауысындағы тіркестер."],
u7c401:["1 · <i>Could you</i> или <i>Could I</i>? Выберите.","1 · <i>Could you</i> ма әлде <i>Could I</i> ма? Таңдаңыз."],
u7c402:["2 · Соедините каждый вопрос с ответом.","2 · Әр сұрақты жауабымен сәйкестендіріңіз."],
u7c403:["3 · Обе версии — правильный английский. Какую вы сказали бы администратору?","3 · Екі нұсқа да дұрыс ағылшын тілі. Әкімшіге қайсысын айтар едіңіз?"],
u7c404:["4 · Составьте просьбу из слов.","4 · Сөздерден өтініш құрастырыңыз."],
u7c405:["5 · В каждой строке одно лишнее слово. Нажмите на него.","5 · Әр жолда бір артық сөз бар. Соны басыңыз."],
u7c406:["6 · <span class=\"pill-rec\">повторение</span> Дополните ответы администратора. Одно-два слова в каждый пропуск.","6 · <span class=\"pill-rec\">қайталау</span> Әкімшінің жауаптарын толықтырыңыз. Әр бос орынға бір-екі сөзден."],
u7c407:["Администратор, который не может пообещать, использует <i>might</i>. Тот, кто уверен, — <i>will</i>. Больше ничего не изменилось.","Уәде бере алмайтын әкімші <i>might</i> қолданады. Сенімдісі — <i>will</i>. Басқа ештеңе өзгерген жоқ."],
u7c408:["Дополнительная отработка","Қосымша жаттығу"],
u7c409:["Перепишите каждую реплику как вежливую просьбу. Используйте слово в скобках.","Әр репликаны сыпайы өтініш ретінде қайта жазыңыз. Жақшадағы сөзді қолданыңыз."],
u7c501:["1 · Прослушайте два диалога. Кто из гостей получает номер?","1 · Екі диалогты тыңдаңыз. Қонақтардың қайсысы нөмірді алады?"],
u7c502:["2 · Прослушайте диалог 1 ещё раз. Дополните информацию.","2 · 1-диалогты тағы тыңдаңыз. Ақпаратты толықтырыңыз."],
u7c503:["3 · Прослушайте диалог 2 ещё раз. Верно или неверно?","3 · 2-диалогты тағы тыңдаңыз. Дұрыс па, бұрыс па?"],
u7c504:["4 · Прослушайте девять фраз. Кто произносит каждую?","4 · Тоғыз тіркесті тыңдаңыз. Әрқайсысын кім айтады?"],
u7c505:["Нажмите на номер, чтобы прослушать фразу ещё раз. Именно эти девять фраз вы используете в ролевой игре.","Тіркесті қайта тыңдау үшін нөмірді басыңыз. Дәл осы тоғыз тіркесті рөлдік ойында қолданасыз."],
u7c506:["5 · Ещё одно заселение. Послушайте и дополните диалог.","5 · Тағы бір орналасу. Тыңдап, диалогты толықтырыңыз."],
u7c601:["Прочитайте записку. Вы читаете её как автор, а не как ученик — ищите части, которые сможете использовать сами.","Хатты оқыңыз. Оны оқушы емес, автор ретінде оқисыз — өзіңіз қолдана алатын бөліктерді іздеңіз."],
u7c602:["И два сообщения другу о том же дне.","Және сол күн туралы досқа екі хабарлама."],
u7c603:["1 · Расставьте четыре части записки в том порядке, в котором они идут.","1 · Хаттың төрт бөлігін келу ретімен орналастырыңыз."],
u7c604:["2 · Найдите в записке фразу, которая выполняет каждую задачу. Напишите её точно так, как она есть.","2 · Хаттан әр міндетті орындайтын тіркесті табыңыз. Оны дәл сол күйінде жазыңыз."],
u7c605:["3 · Записка или сообщение другу? Выберите, куда относится каждая строка.","3 · Хат па әлде досқа хабарлама ма? Әр жолдың қайда жататынын таңдаңыз."],
u7c606:["4 · Чем отличаются сообщения другу? Выберите все верные варианты.","4 · Досқа жазылған хабарламалар немен ерекшеленеді? Барлық дұрыс нұсқаны таңдаңыз."],
u7c701:["Полезные фразы","Пайдалы сөз тіркестері"],
u7c702:["1 · Работа в парах. Прочитайте только свою карточку. Не показывайте её партнёру.","1 · Жұппен жұмыс. Тек өз картаңызды оқыңыз. Оны серіктесіңізге көрсетпеңіз."],
u7c703:["2 · Работа в парах. Проведите диалог. Используйте блок полезных фраз.","2 · Жұппен жұмыс. Диалогты жүргізіңіз. Пайдалы тіркестер блогын қолданыңыз."],
u7c704:["Не пишите сценарий. Начните с <i>I’d like to check in, please</i> и посмотрите, куда это приведёт.","Сценарий жазбаңыз. <i>I’d like to check in, please</i> дегеннен бастап, қайда апаратынын көріңіз."],
u7c705:["3 · Поменяйтесь карточками и повторите со второй ситуацией.","3 · Карталарды ауыстырып, екінші жағдаймен қайталаңыз."],
u7c706:["Второй раз — это то, ради чего всё делается. Используйте минимум четыре фразы из блока.","Екінші рет — бәрі соның үшін. Блоктан кемінде төрт тіркес қолданыңыз."],
u7c707:["Преподавателю","Мұғалімге"],
u7c708:["Обратная связь после задания: одна хорошо использованная фраза и одна, которую стоит попробовать в следующий раз. Слушайте, не появляется ли <i>Could you to…</i> и голое повелительное. Не исправляйте во время ролевой игры.","Тапсырмадан кейінгі кері байланыс: жақсы қолданылған бір тіркес және келесіде байқап көретін біреуі. <i>Could you to…</i> мен жалаң бұйрық райын байқаңыз. Рөлдік ойын кезінде түзетпеңіз."],
u7c709:["1 · Прочитайте свою карточку. Преподаватель — за стойкой.","1 · Өз картаңызды оқыңыз. Мұғалім — тіркеу орнында."],
u7c710:["2 · Работа с преподавателем. Проведите диалог. Используйте блок полезных фраз.","2 · Мұғаліммен жұмыс. Диалогты жүргізіңіз. Пайдалы тіркестер блогын қолданыңыз."],
u7c711:["3 · Поменяйтесь ролями с преподавателем и проведите вторую ситуацию.","3 · Мұғаліммен рөл ауыстырып, екінші жағдайды өткізіңіз."],
u7c712:["Проверяйте после, а не во время: одна хорошо использованная фраза и одна, которую стоит попробовать в следующий раз.","Тапсырма кезінде емес, кейін тексеріңіз: жақсы қолданылған бір тіркес және келесіде байқап көретін біреуі."],
u7c713:["1 · Спланируйте записку, прежде чем писать её.","1 · Хатты жазбас бұрын жоспарлаңыз."],
u7c714:["Вы в номере 508. Душ не работает, полотенец нет, и вас не будет с двух до пяти.","Сіз 508-нөмірдесіз. Душ жұмыс істемейді, сүлгі жоқ, ал сіз екіден беске дейін болмайсыз."],
u7c715:["Банк фраз","Тіркестер банкі"],
u7c716:["2 · Теперь напишите записку. От шестидесяти до восьмидесяти слов.","2 · Енді хатты жазыңыз. Алпыстан сексен сөзге дейін."],
u7c717:["3 · Теперь напишите одно короткое сообщение другу о том же дне.","3 · Енді сол күн туралы досқа бір қысқа хабарлама жазыңыз."],
u7c718:["Двадцать-тридцать слов. Краткие формы, без <i>Dear</i> и без <i>Thank you very much</i>.","Жиырма-отыз сөз. Қысқа түрлер, <i>Dear</i>-сыз және <i>Thank you very much</i>-сыз."],
u7c719:["4 · Проверьте свою записку, прежде чем куда-либо её отправлять.","4 · Хатты бір жерге жіберер алдында тексеріңіз."],
u7c801:["Отметьте всё, что вы уже умеете.","Меңгергеніңіздің бәрін белгілеңіз."],
u7c802:["Преподавателю","Мұғалімге"],
u7c803:["Завершите уроком-чеклистом. Скажите вслух, что сегодня вернулись <i>will</i>, <i>might</i> и неопределённые местоимения — в упражнении 6 и внутри ролевой игры. Затем скажите, что дальше идёт итоговый тест по Unit 7 и что его можно проходить сколько угодно раз.","Сабақты чек-парақпен аяқтаңыз. Бүгін <i>will</i>, <i>might</i> және белгісіздік есімдіктері оралғанын дауыстап айтыңыз — 6-жаттығуда және рөлдік ойында. Содан кейін алда Unit 7 қорытынды тесті тұрғанын және оны қалағанша өтуге болатынын айтыңыз."],
u7a411:["6 · Прогноз или уже принятый план? Выберите.","6 · Болжам ба әлде қабылданған жоспар ма? Таңдаңыз."],
u7a412:["7 · Дополните абзац. По одному слову в каждый пропуск.","7 · Абзацты толықтырыңыз. Әр бос орынға бір сөзден."],
u7b408:["7 · В каждом предложении одно лишнее слово. Нажмите на него.","7 · Әр сөйлемде бір артық сөз бар. Соны басыңыз."],
u7b409:["8 · Напишите прилагательное на <i>-ed</i> или <i>-ing</i> от глагола в скобках.","8 · Жақшадағы етістіктен <i>-ed</i> немесе <i>-ing</i> сын есімін жазыңыз."],
u7c410:["7 · Что вы скажете? Выберите фразу, подходящую к ситуации.","7 · Не айтасыз? Жағдайға сай тіркесті таңдаңыз."],
u7c411:["8 · Дополните диалог на ресепшене. Одно-два слова в каждый пропуск.","8 · Қабылдау бөлмесіндегі диалогты толықтырыңыз. Әр бос орынға бір-екі сөзден."],
/* ---- Unit 8 ---- */
u2101:["Прочитайте восемь навыков. Отметьте три, которые получаются у вас лучше всего.","Сегіз дағдыны оқыңыз. Өзіңізде ең жақсы шығатын үшеуін белгілеңіз."],
u2102:["Правильного ответа нет. Выберите три, затем напишите одно предложение ниже.","Дұрыс жауап жоқ. Үшеуін таңдап, төменде бір сөйлем жазыңыз."],
u2103:["Правильного ответа нет. Выберите три и расскажите преподавателю.","Дұрыс жауап жоқ. Үшеуін таңдап, мұғалімге айтыңыз."],
u2104:["Правильного ответа нет. Выберите три и сравните с партнёром.","Дұрыс жауап жоқ. Үшеуін таңдап, серіктесіңізбен салыстырыңыз."],
u2105:["Отметьте три. Нажмите ещё раз, чтобы убрать.","Үшеуін белгілеңіз. Алып тастау үшін қайта басыңыз."],
u2106:["Запишите","Жазып алыңыз"],
u2107:["Обсудите","Талқылаңыз"],
u2201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
u2202:["Показать перевод","Аудармасын көрсету"],
u2203:["1 · Соедините каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u2205:["3 · Какое слово подходит? Эти пары легко перепутать.","3 · Қай сөз келеді? Бұл жұптарды шатастыру оңай."],
u2206:["Прочитайте предложение целиком, прежде чем выбирать. Слова близки, но подходит только одно.","Таңдамас бұрын сөйлемді толық оқыңыз. Сөздер ұқсас, бірақ біреуі ғана келеді."],
u2207:["4 · Какое слово идёт с каждым? Выберите естественную пару.","4 · Әрқайсысымен қай сөз келеді? Табиғи жұпты таңдаңыз."],
u2208:["Английский закрепляет некоторые слова вместе. Учить пару быстрее, чем слово по отдельности.","Ағылшын тілі кейбір сөздерді бірге бекітеді. Жұпты үйрену жеке сөзді үйренуден жылдам."],
u2209:["5 · Постройте слово. Напишите недостающую форму.","5 · Сөзді құрыңыз. Жетіспейтін пішінді жазыңыз."],
u2210:["Одно окончание меняет роль слова в предложении.","Бір жалғау сөздің сөйлемдегі қызметін өзгертеді."],
u2211:["6 · Послушайте. Насколько хорошо это получается у каждого? Выберите то, что слышите.","6 · Тыңдаңыз. Әрқайсысында бұл қаншалықты жақсы шығады? Естігеніңізді таңдаңыз."],
u2212:["Семь коротких предложений. Слова перед good at говорят, насколько.","Жеті қысқа сөйлем. Good at алдындағы сөздер қаншалықты екенін айтады."],
u2213:["Нажмите на номер, чтобы услышать это предложение отдельно.","Сол сөйлемді бөлек тыңдау үшін нөмірді басыңыз."],
u2214:["После good at, brilliant at или terrible at глагол принимает -ing.","Good at, brilliant at немесе terrible at кейін етістік -ing жалғауын алады."],
u2215:["7 · Работайте в парах. Проверьте друг друга по словам.","7 · Жұпта жұмыс істеңіз. Бір-біріңізді сөздер бойынша тексеріңіз."],
u2216:["Студент A читает значение с карточки A. Студент B называет слово, не подглядывая. Затем поменяйтесь карточками.","А студенті А картасынан мағынаны оқиды. B студенті қарамай сөзді айтады. Содан кейін карталарды ауыстырыңыз."],
u2217:["По пять слов каждому. Если партнёр не может вспомнить слово, подскажите первый звук, а не ответ.","Әрқайсысына бес сөзден. Серіктесіңіз сөзді есіне түсіре алмаса, жауапты емес, бірінші дыбысты айтыңыз."],
u2218:["7 · Проверьте себя с преподавателем.","7 · Мұғаліммен бірге тексеріңіз."],
u2219:["Преподаватель читает значение. Вы называете слово, не подглядывая. Затем меняетесь ролями.","Мұғалім мағынаны оқиды. Сіз қарамай сөзді айтасыз. Содан кейін рөлдерді ауыстырасыз."],
u2220:["8 · Дополните предложения. Выберите правильное слово.","8 · Сөйлемдерді толықтырыңыз. Дұрыс сөзді таңдаңыз."],
u2301:["Прочитайте эти четыре предложения из урока.","Сабақтан алынған осы төрт сөйлемді оқыңыз."],
u2302:["Посмотрите на четыре предложения. Что идёт после can, could и be able to?","Төрт сөйлемге қараңыз. Can, could және be able to кейін не келеді?"],
u2303:["Три формы","Үш пішін"],
u2304:["ФОРМА. can / can't / could / couldn't + простой глагол. be able to + to + простой глагол. Никогда can to, никогда can swimming.","ПІШІН. can / can't / could / couldn't + жай етістік. be able to + to + жай етістік. Ешқашан can to емес."],
u2305:["УПОТРЕБЛЕНИЕ. can = способность сейчас · could = способность в прошлом · be able to = та же идея во временах, которых у can нет.","ҚОЛДАНЫСЫ. can = қазіргі қабілет · could = өткендегі қабілет · be able to = can-да жоқ шақтардағы сол идея."],
u2306:["Не «I will can help», не «I can to drive», не «She cans read».","«I will can help», «I can to drive», «She cans read» деп айтпаңыз."],
u2307:["Долженствование — must и have to — будет на следующем уроке, и после модального глагола ведёт себя так же.","Міндеттілік — must пен have to — келесі сабақта, модальдан кейін дәл солай."],
u2308:["ФОРМА. can и could — модальные глаголы. Они не берут -s, не берут to, и глагол после них остаётся простым.","ПІШІН. can мен could — модаль етістіктер. Оларға -s те, to да жалғанбайды."],
u2309:["УПОТРЕБЛЕНИЕ. can — способность сейчас, could — способность в прошлом. be able to — там, где у can нет формы.","ҚОЛДАНЫСЫ. can — қазіргі қабілет, could — өткендегі қабілет. be able to — can-да пішін жоқ жерде."],
u2310:["Одно исключение: для единичного события в прошлом английский предпочитает was/were able to, а не could.","Бір ерекшелік: өткендегі жеке оқиға үшін could емес, was/were able to қолданылады."],
u2311:["Три ошибки: «I will can help you» · «She can to drive» · «He cans swim».","Үш қате: «I will can help you» · «She can to drive» · «He cans swim»."],
u2312:["На следующем уроке та же схема вернётся с долженствованием.","Келесі сабақта дәл сол сызба міндеттілікпен қайта оралады."],
u2401:["1 · Выберите правильную форму.","1 · Дұрыс пішінді таңдаңыз."],
u2402:["2 · Скажите иначе. Напишите be able to в нужной форме.","2 · Басқаша айтыңыз. be able to тиісті пішінде жазыңыз."],
u2403:["3 · В каждом предложении одно слово неверно. Нажмите на него.","3 · Әр сөйлемде бір сөз қате. Соны басыңыз."],
u2404:["Нажмите на слово, которое вы бы убрали или изменили. Нажмите ещё раз, чтобы передумать.","Алып тастайтын немесе өзгертетін сөзді басыңыз. Ойыңызды өзгерту үшін қайта басыңыз."],
u2405:["4 · Сейчас или тогда? Прочитайте предложение и выберите время.","4 · Қазір ме, әлде сонда ма? Сөйлемді оқып, уақытты таңдаңыз."],
u2406:["5 · Дополните предложения.","5 · Сөйлемдерді толықтырыңыз."],
u2407:["Эти маленькие слова вернулись сегодня в тексте о мозге. Напишите по одному слову в каждый пропуск.","Бұл шағын сөздер бүгін мидағы мәтінде қайта оралды. Әр бос орынға бір сөз жазыңыз."],
u2408:["6 · Постройте предложение. Нажимайте слова в правильном порядке.","6 · Сөйлемді құрыңыз. Сөздерді дұрыс ретпен басыңыз."],
u2409:["Нажмите на слово, чтобы добавить его. Нажмите ещё раз, чтобы убрать.","Қосу үшін сөзді басыңыз. Алып тастау үшін қайта басыңыз."],
u2410:["7 · Найдите того, кто… Работайте в парах, затем смените партнёра.","7 · Кім екенін табыңыз… Жұпта жұмыс істеп, содан кейін серіктесті ауыстырыңыз."],
u2411:["Задайте партнёру четыре вопроса с карточки. После каждого ответа — уточняющий вопрос. Затем возьмите вторую карточку.","Серіктесіңізге картадан төрт сұрақ қойыңыз. Әр жауаптан кейін нақтылаушы сұрақ. Содан соң екінші картаны алыңыз."],
u2412:["Отвечайте сначала кратко — Yes, I can. / No, I couldn't. — затем добавьте одно предложение.","Алдымен қысқа жауап беріңіз — Yes, I can. / No, I couldn't. — сосын бір сөйлем қосыңыз."],
u2413:["7 · Узнайте о своём преподавателе.","7 · Мұғаліміңіз туралы біліңіз."],
u2414:["Задайте преподавателю четыре вопроса с первой карточки. Затем преподаватель берёт вторую и спрашивает вас.","Мұғалімге бірінші картадан төрт сұрақ қойыңыз. Содан кейін мұғалім екінші картаны алып, сізден сұрайды."],
u2415:["Преподавателю: один раз повторите неверную форму правильно и продолжайте. Ошибки соберите на конец.","Мұғалімге: қате пішінді бір рет дұрыс қайталап, жалғастырыңыз. Қателерді соңына жинаңыз."],
u2501:["Перед чтением: многие говорят, что мы используем только десять процентов мозга.","Оқымас бұрын: көпшілік мидың тек он пайызын пайдаланамыз дейді."],
u2502:["Как вы думаете, это правда? Решите сначала, потом прочитайте и проверьте.","Бұл рас деп ойлайсыз ба? Алдымен шешіңіз, сосын оқып тексеріңіз."],
u2503:["Правильного ответа пока нет. Это ваш прогноз.","Әзірге дұрыс жауап жоқ. Бұл сіздің болжамыңыз."],
u2504:["1 · Прочитайте один раз ради основной мысли. Выберите лучший ответ.","1 · Негізгі ойды түсіну үшін бір рет оқыңыз. Ең жақсы жауапты таңдаңыз."],
u2505:["2 · Прочитайте ещё раз. Верно или неверно?","2 · Қайта оқыңыз. Дұрыс па, бұрыс па?"],
u2506:["3 · Прочитайте ещё раз ради деталей. Ответьте числом или одним словом.","3 · Егжей-тегжейін білу үшін қайта оқыңыз. Санмен немесе бір сөзбен жауап беріңіз."],
u2507:["4 · Найдите в тексте слово, которое означает…","4 · Мәтіннен мына мағынадағы сөзді табыңыз…"],
u2508:["5 · Найдите в тексте форму способности. Напишите недостающие слова.","5 · Мәтіннен қабілет пішінін табыңыз. Жетіспейтін сөздерді жазыңыз."],
u2509:["После чтения","Оқығаннан кейін"],
u2510:["6 · Теперь послушайте конец радиопередачи о мозге. Выберите три вещи, которые говорит учёный.","6 · Енді ми туралы радиохабардың соңын тыңдаңыз. Ғалым айтқан үш нәрсені таңдаңыз."],
u2511:["Одного прослушивания достаточно.","Бір рет тыңдау жеткілікті."],
u2512:["Три из шести есть в записи. Трёх нет.","Алтаудың үшеуі жазбада бар. Үшеуі жоқ."],
u2601:["1 · Работайте в парах. Возьмите карточку и проведите интервью с партнёром.","1 · Жұпта жұмыс істеңіз. Картаны алып, серіктесіңізден сұхбат алыңыз."],
u2602:["1 · Работайте с преподавателем. Возьмите карточку и проведите интервью.","1 · Мұғаліммен жұмыс істеңіз. Картаны алып, сұхбат алыңыз."],
u2603:["Полезные фразы","Пайдалы тіркестер"],
u2604:["1 · Напишите шесть предложений о своих способностях.","1 · Өз қабілеттеріңіз туралы алты сөйлем жазыңыз."],
u2605:["2 · Теперь напишите короткий ответ на этот вопрос.","2 · Енді осы сұраққа қысқа жауап жазыңыз."],
u2606:["3 · Проверьте свою работу, прежде чем закончить.","3 · Аяқтамас бұрын жұмысыңызды тексеріңіз."],
u2609:["Обсудите","Талқылаңыз"],
u2610:["Преподавателю","Мұғалімге"],
u2701:["Отметьте всё, что вы теперь умеете.","Енді не істей алатыныңыздың бәрін белгілеңіз."],
/* ===== Unit 8 · Lesson 23 ===== */
u2301a:["Расставьте шесть правил по порядку — от самого полезного к наименее полезному.","Алты ережені пайдалысынан пайдасызына қарай ретімен қойыңыз."],
u2302a:["Нажимайте в своём порядке. Правильного ответа нет — затем напишите, почему первое место у вашего номера один.","Өз ретіңізбен басыңыз. Дұрыс жауап жоқ — сосын бірінші орында не үшін тұрғанын жазыңыз."],
u2303a:["Нажимайте в своём порядке, затем объясните преподавателю свой номер один.","Өз ретіңізбен басып, содан кейін бірінші орынды мұғалімге түсіндіріңіз."],
u2304a:["Нажимайте в своём порядке, затем сравните с партнёром. Вы должны договориться о первых двух.","Өз ретіңізбен басып, серіктесіңізбен салыстырыңыз. Алғашқы екеуі бойынша келісуіңіз керек."],
u2305a:["Нажмите на правило, чтобы дать ему следующий номер. Нажмите ещё раз, чтобы убрать.","Ережеге келесі нөмірді беру үшін оны басыңыз. Алып тастау үшін қайта басыңыз."],
u2306a:["Запишите","Жазып алыңыз"],
u2307a:["Обсудите","Талқылаңыз"],
u2308a:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
u2309a:["Показать перевод","Аудармасын көрсету"],
u2310a:["1 · Соедините каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u2311a:["3 · Распределите слова по колонкам.","3 · Сөздерді бағандарға бөліңіз."],
u2312a:["Одни слова — о месте, где вы учитесь; другие — о документе, который вы получаете в конце.","Кейбір сөздер оқитын орын туралы; басқалары соңында алатын құжат туралы."],
u2313a:["4 · Лишнее слово. Какое не подходит?","4 · Артық сөз. Қайсысы келмейді?"],
u2314a:["5 · Послушайте шесть коротких разговоров. Вы слышите make или do?","5 · Алты қысқа әңгімені тыңдаңыз. make па, do па естисіз?"],
u2315a:["Английский закрепляет эти пары. Правила, работающего всегда, нет — учите пару.","Ағылшын тілі бұл жұптарды бекітеді. Әрқашан жұмыс істейтін ереже жоқ — жұпты үйреніңіз."],
u2316a:["Нажмите на номер, чтобы услышать этот разговор отдельно.","Сол әңгімені бөлек тыңдау үшін нөмірді басыңыз."],
u2317a:["6 · make или do? Напишите по одному слову в каждый пропуск.","6 · make па, do па? Әр бос орынға бір сөз жазыңыз."],
u2318a:["7 · Работайте в парах. Проверьте друг друга по словам.","7 · Жұпта жұмыс істеңіз. Бір-біріңізді сөздер бойынша тексеріңіз."],
u2319a:["Студент A читает значение с карточки A. Студент B называет слово, не подглядывая. Затем поменяйтесь карточками.","А студенті А картасынан мағынаны оқиды. B студенті қарамай сөзді айтады. Содан кейін карталарды ауыстырыңыз."],
u2320a:["По пять слов каждому. Если партнёр не может вспомнить слово, подскажите первый звук, а не ответ.","Әрқайсысына бес сөзден. Серіктесіңіз сөзді есіне түсіре алмаса, жауапты емес, бірінші дыбысты айтыңыз."],
u2321a:["7 · Проверьте себя с преподавателем.","7 · Мұғаліммен бірге тексеріңіз."],
u2322a:["Преподаватель читает значение. Вы называете слово, не подглядывая. Затем меняетесь ролями.","Мұғалім мағынаны оқиды. Сіз қарамай сөзді айтасыз. Содан кейін рөлдерді ауыстырасыз."],
u2323a:["8 · Дополните предложения. Выберите правильное слово.","8 · Сөйлемдерді толықтырыңыз. Дұрыс сөзді таңдаңыз."],
u2324a:["Прочитайте эти четыре предложения о школе.","Мектеп туралы осы төрт сөйлемді оқыңыз."],
u2325a:["Посмотрите на предложения 3 и 4. В чём разница?","3 және 4 сөйлемдерге қараңыз. Айырмашылығы неде?"],
u2326a:["Четыре значения","Төрт мағына"],
u2327a:["ФОРМА. must и mustn't — модальные: без -s, без to, без do в вопросе. have to — обычный глагол: has to, had to, do you have to…?","ПІШІН. must пен mustn't — модаль: -s жоқ, to жоқ, сұрақта do жоқ. have to — қарапайым етістік."],
u2328a:["УПОТРЕБЛЕНИЕ. must / have to = необходимо · don't have to = не обязательно · mustn't / can't = запрещено · can = разрешено.","ҚОЛДАНЫСЫ. must / have to = қажет · don't have to = міндетті емес · mustn't / can't = тыйым салынған · can = рұқсат."],
u2329a:["Главная пара: You mustn't pay (запрещено) — это не You don't have to pay (бесплатно).","Ең маңызды жұп: You mustn't pay (тыйым) — бұл You don't have to pay (тегін) емес."],
u2330a:["Совет — should и why don't you — будет в уроке 27, и там тоже простой глагол.","Кеңес — should пен why don't you — 27-сабақта, онда да жай етістік."],
u2331a:["ФОРМА. must — модальный глагол, как can. have to — обычный глагол и изменяется как обычный.","ПІШІН. must — can сияқты модаль етістік. have to — қарапайым етістік және солай өзгереді."],
u2332a:["УПОТРЕБЛЕНИЕ — необходимость. must — правило от себя или написанное правило. have to — правило извне. В речи have to встречается чаще.","ҚОЛДАНЫСЫ — қажеттілік. must — өзіңізден шыққан немесе жазылған ереже. have to — сырттан келген ереже."],
u2333a:["УПОТРЕБЛЕНИЕ — два отрицания. Это и есть весь урок. don't have to = вы свободны. mustn't = вам нельзя.","ҚОЛДАНЫСЫ — екі болымсыздық. Бүкіл сабақ осында. don't have to = сіз еріктісіз. mustn't = сізге болмайды."],
u2334a:["Три ошибки: «I must to go» · «He have to work» · «I musted study» (в прошлом — had to).","Үш қате: «I must to go» · «He have to work» · «I musted study» (өткенде — had to)."],
u2335a:["В уроке 27 тот же простой глагол вернётся после should и ought to.","27-сабақта дәл сол жай етістік should және ought to кейін оралады."],
u2336a:["Теперь послушайте четыре предложения о разрешении. В каком из них что-то разрешено?","Енді рұқсат туралы төрт сөйлемді тыңдаңыз. Қайсысында бірдеңеге рұқсат берілген?"],
u2337a:["В трёх из них что-то не разрешено. Только одно даёт разрешение.","Үшеуінде бірдеңеге рұқсат жоқ. Тек біреуі рұқсат береді."],
u2338a:["1 · Выберите правильную форму.","1 · Дұрыс пішінді таңдаңыз."],
u2339a:["2 · Что означает надпись? Выберите верное значение.","2 · Жазу нені білдіреді? Дұрыс мағынаны таңдаңыз."],
u2340a:["Читайте внимательно. Две формы похожи и означают противоположное.","Мұқият оқыңыз. Екі пішін ұқсас, бірақ мағынасы қарама-қарсы."],
u2341a:["3 · Скажите иначе. Напишите недостающие слова.","3 · Басқаша айтыңыз. Жетіспейтін сөздерді жазыңыз."],
u2342a:["4 · В каждом предложении одно слово неверно. Нажмите на него.","4 · Әр сөйлемде бір сөз қате. Соны басыңыз."],
u2343a:["Нажмите на слово, которое вы бы убрали или изменили. Нажмите ещё раз, чтобы передумать.","Алып тастайтын немесе өзгертетін сөзді басыңыз. Ойыңызды өзгерту үшін қайта басыңыз."],
u2344a:["5 · Способность или обязанность? Выберите правильное слово.","5 · Қабілет пе, міндет пе? Дұрыс сөзді таңдаңыз."],
u2345a:["На прошлом уроке эти формы означали способность. Сегодня некоторые из них означают правило. Сначала прочитайте всё предложение.","Өткен сабақта бұл пішіндер қабілетті білдірді. Бүгін кейбірі ережені білдіреді. Алдымен сөйлемді толық оқыңыз."],
u2346a:["6 · Дополните диалог. Напишите одно-два слова в каждый пропуск.","6 · Диалогты толықтырыңыз. Әр бос орынға бір-екі сөз жазыңыз."],
u2347a:["7 · Две школы. Работайте в парах.","7 · Екі мектеп. Жұпта жұмыс істеңіз."],
u2348a:["У каждого правила своей школы. Не показывайте карточку. Задавайте вопросы и найдите три различия. Затем поменяйтесь.","Әрқайсыңызда өз мектебіңіздің ережелері. Картаны көрсетпеңіз. Сұрақ қойып, үш айырмашылық табыңыз."],
u2349a:["Спрашивайте Do students have to…? Can they…? Отвечайте They have to… / They don't have to… / They can't…","Do students have to…? Can they…? деп сұраңыз. They have to… деп жауап беріңіз."],
u2350a:["7 · Две школы. Работайте с преподавателем.","7 · Екі мектеп. Мұғаліммен жұмыс істеңіз."],
u2351a:["У вас правила одной школы, у преподавателя — другой. Не смотрите в чужую карточку. Найдите три различия, затем поменяйтесь.","Сізде бір мектептің, мұғалімде екінші мектептің ережелері. Үш айырмашылық тауып, ауысыңыз."],
u2352a:["Преподавателю: отвечайте полной фразой — They don't have to… — чтобы студент услышал форму до того, как произнесёт её сам.","Мұғалімге: толық сөйлеммен жауап беріңіз — They don't have to… — студент пішінді алдымен естісін."],
u2353a:["Перед чтением: в одной стране почти нет школьных экзаменов до восемнадцати лет.","Оқымас бұрын: бір елде он сегіз жасқа дейін мектеп емтихандары жоқтың қасы."],
u2354a:["Как вы думаете, что стало с её результатами? Решите сначала, потом прочитайте.","Оның нәтижелері қандай болды деп ойлайсыз? Алдымен шешіңіз, сосын оқыңыз."],
u2355a:["Правильного ответа пока нет. Это ваш прогноз.","Әзірге дұрыс жауап жоқ. Бұл сіздің болжамыңыз."],
u2356a:["1 · Прочитайте один раз ради основной мысли. Выберите лучший ответ.","1 · Негізгі ойды түсіну үшін бір рет оқыңыз. Ең жақсы жауапты таңдаңыз."],
u2357a:["2 · Прочитайте ещё раз. Верно или неверно?","2 · Қайта оқыңыз. Дұрыс па, бұрыс па?"],
u2358a:["3 · Прочитайте ещё раз ради деталей. Ответьте числом или одним словом.","3 · Егжей-тегжейін білу үшін қайта оқыңыз. Санмен немесе бір сөзбен жауап беріңіз."],
u2359a:["4 · Найдите в тексте слово, которое означает…","4 · Мәтіннен мына мағынадағы сөзді табыңыз…"],
u2360a:["5 · Найдите в тексте форму долженствования. Напишите недостающие слова.","5 · Мәтіннен міндеттілік пішінін табыңыз. Жетіспейтін сөздерді жазыңыз."],
u2361a:["После чтения","Оқығаннан кейін"],
u2362a:["Полезные фразы","Пайдалы тіркестер"],
u2363a:["1 · Работайте в парах. Откройте школу вместе.","1 · Жұпта жұмыс істеңіз. Бірге мектеп ашыңыз."],
u2364a:["Договоритесь о шести правилах: два have to, два don't have to, одно mustn't, одно can. Пишите тезисно.","Алты ереже туралы келісіңіз: екі have to, екі don't have to, бір mustn't, бір can."],
u2365a:["2 · Представьте свою школу другой паре. Затем выберите.","2 · Мектебіңізді басқа жұпқа таныстырыңыз. Содан кейін таңдаңыз."],
u2366a:["Прочитайте шесть правил вслух. Другая пара задаёт три вопроса. Затем каждая пара решает, в какую школу отдала бы ребёнка, и объясняет почему.","Алты ережені дауыстап оқыңыз. Басқа жұп үш сұрақ қояды. Сосын әр жұп таңдау жасайды."],
u2367a:["Преподавателю","Мұғалімге"],
u2368a:["1 · Работайте с преподавателем. Откройте школу вместе.","1 · Мұғаліммен жұмыс істеңіз. Бірге мектеп ашыңыз."],
u2369a:["Договоритесь о шести правилах. Вы предлагаете, преподаватель спорит.","Алты ереже туралы келісіңіз. Сіз ұсынасыз, мұғалім қарсы дәлел айтады."],
u2370a:["2 · Теперь защитите её.","2 · Енді оны қорғаңыз."],
u2371a:["Прочитайте шесть правил вслух полными предложениями. Преподаватель задаст три трудных вопроса. Отвечайте, не меняя правило.","Алты ережені толық сөйлеммен дауыстап оқыңыз. Мұғалім үш қиын сұрақ қояды."],
u2372a:["1 · Напишите правила своей собственной школы.","1 · Өз мектебіңіздің ережелерін жазыңыз."],
u2373a:["Шесть правил, шесть полных предложений: два have to, два don't have to, одно mustn't, одно can.","Алты ереже, алты толық сөйлем: екі have to, екі don't have to, бір mustn't, бір can."],
u2374a:["2 · Теперь сравните её со своей настоящей школой. Около 80 слов.","2 · Енді оны нақты мектебіңізбен салыстырыңыз. Шамамен 80 сөз."],
u2375a:["Что вам приходилось делать в школе, чего не придётся делать в вашей новой школе? Используйте прошедшее: had to, didn't have to, couldn't.","Мектепте не істеуге тура келді? Өткен шақты қолданыңыз: had to, didn't have to, couldn't."],
u2376a:["3 · Проверьте свою работу, прежде чем закончить.","3 · Аяқтамас бұрын жұмысыңызды тексеріңіз."],
u2379a:["Отметьте всё, что вы теперь умеете.","Енді не істей алатыныңыздың бәрін белгілеңіз."],
/* ===== Unit 8 · Lesson 24 ===== */
u2401a:["Соедините каждую ситуацию с причиной, по которой вы не смогли понять.","Әр жағдайды түсінбеу себебімен сәйкестендіріңіз."],
u2402a:["Затем напишите о последнем случае, когда это произошло с вами на английском.","Содан кейін ағылшын тілінде мұндай жағдай соңғы рет қашан болғанын жазыңыз."],
u2403a:["Затем скажите преподавателю, какая ситуация случается с вами чаще всего.","Содан кейін мұғалімге қай жағдай жиі болатынын айтыңыз."],
u2404a:["Затем скажите партнёру, какая ситуация случается с вами чаще всего.","Содан кейін серіктесіңізге қай жағдай жиі болатынын айтыңыз."],
u2405a:["Запишите","Жазып алыңыз"],
u2406a:["Обсудите","Талқылаңыз"],
u2407a:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
u2408a:["Показать перевод","Аудармасын көрсету"],
u2409a:["1 · Соедините каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u2410a:["3 · Заполните анкету. В какую строку идёт каждый ответ?","3 · Сауалнаманы толтырыңыз. Әр жауап қай жолға жазылады?"],
u2411a:["Это Адам Райт, родился 13 августа 1996 года. Он не женат и работает фотографом.","Бұл Адам Райт, 1996 жылы 13 тамызда туған. Ол үйленбеген, фотограф болып жұмыс істейді."],
u2412a:["4 · Какое слово подходит? Эти три близки, но не одинаковы.","4 · Қай сөз келеді? Бұл үшеуі ұқсас, бірақ бірдей емес."],
u2413a:["apply, enrol и register — все вносят ваше имя куда-то, но не в одно и то же место.","apply, enrol және register — бәрі есіміңізді бір жерге жазады, бірақ бір жерге емес."],
u2414a:["5 · Какое слово идёт с каждым? Выберите естественную пару.","5 · Әрқайсысымен қай сөз келеді? Табиғи жұпты таңдаңыз."],
u2415a:["6 · Работайте в парах. Проверьте друг друга по словам.","6 · Жұпта жұмыс істеңіз. Бір-біріңізді сөздер бойынша тексеріңіз."],
u2416a:["Студент A читает значение с карточки A. Студент B называет слово, не подглядывая. Затем поменяйтесь карточками.","А студенті А картасынан мағынаны оқиды. B студенті қарамай сөзді айтады."],
u2417a:["По пять слов каждому. Если партнёр не может вспомнить слово, подскажите первый звук, а не ответ.","Әрқайсысына бес сөзден. Жауапты емес, бірінші дыбысты айтыңыз."],
u2418a:["6 · Проверьте себя с преподавателем.","6 · Мұғаліммен бірге тексеріңіз."],
u2419a:["Преподаватель читает значение. Вы называете слово, не подглядывая. Затем меняетесь ролями.","Мұғалім мағынаны оқиды. Сіз қарамай сөзді айтасыз. Содан кейін рөлдерді ауыстырасыз."],
u2420a:["7 · Дополните предложения. Выберите правильное слово.","7 · Сөйлемдерді толықтырыңыз. Дұрыс сөзді таңдаңыз."],
u2421a:["Прочитайте эти четыре реплики из трёх настоящих разговоров.","Үш нақты әңгімеден алынған осы төрт репликаны оқыңыз."],
u2422a:["Посмотрите на реплики. В чём разница между репликой 2 и репликой 3?","Репликаларға қараңыз. 2 мен 3-тің айырмашылығы неде?"],
u2423a:["Выбирайте фразу по проблеме","Мәселеге қарай тіркесті таңдаңыз"],
u2424a:["ФОРМА. После Could you и Please could you глагол остаётся простым: Could you repeat that? — не Could you to repeat.","ПІШІН. Could you және Please could you кейін етістік жай күйінде қалады."],
u2425a:["УПОТРЕБЛЕНИЕ. Подберите фразу к проблеме. repeat просит те же слова; explain или What do you mean by…? просит другие слова.","ҚОЛДАНЫСЫ. Тіркесті мәселеге қарай таңдаңыз. repeat — сол сөздер, explain — басқа сөздер."],
u2426a:["«What?» — не ошибка, просто грубо. Одно слово Sorry впереди всё меняет.","«What?» қате емес, жай дөрекі. Алдына Sorry деген бір сөз бәрін өзгертеді."],
u2427a:["Та же вежливая рамка вернётся в уроке 30 — для проблемы в ресторане.","Дәл сол сыпайы құрылым 30-сабақта мейрамханадағы мәселе үшін оралады."],
u2428a:["ФОРМА. Это устойчивые фразы: учите целиком. После Could you глагол всегда простой.","ПІШІН. Бұл тұрақты тіркестер: тұтас үйреніңіз. Could you кейін етістік әрқашан жай."],
u2429a:["УПОТРЕБЛЕНИЕ — главный выбор. Не расслышали — просите repeat. Не знаете слово — просите explain. Неверный выбор — самая частая ошибка на этом уровне.","ҚОЛДАНЫСЫ — басты таңдау. Естімесеңіз — repeat. Сөзді білмесеңіз — explain."],
u2430a:["Вежливость. В английском вежливость даёт одно маленькое слово в начале, а не особая форма глагола.","Сыпайылық. Ағылшын тілінде сыпайылықты басындағы шағын сөз береді."],
u2431a:["Не нагромождайте смягчители: Sorry, please could you possibly perhaps repeat that? Одного достаточно.","Жұмсартқыштарды үйіп қоймаңыз. Біреуі жеткілікті."],
u2432a:["Та же рамка понадобится в уроке 30 в ресторане и в уроке 36 на собеседовании.","Дәл сол құрылым 30 және 36-сабақтарда керек болады."],
u2433a:["1 · Повторить или объяснить? Выберите, что бы вы сказали.","1 · Қайталау ма, түсіндіру ме? Не айтарыңызды таңдаңыз."],
u2434a:["2 · Дополните фразу. Напишите по одному слову в каждый пропуск.","2 · Тіркесті толықтырыңыз. Әр бос орынға бір сөз жазыңыз."],
u2435a:["3 · В каждой строке одно слово неверно. Нажмите на него.","3 · Әр жолда бір сөз қате. Соны басыңыз."],
u2436a:["4 · Дополните разговор. Каждый раз выбирайте лучшую реплику.","4 · Әңгімені толықтырыңыз. Әр жолы ең қолайлы репликаны таңдаңыз."],
u2437a:["5 · Что говорит колледж?","5 · Колледж не дейді?"],
u2438a:["Долженствование вернулось в последней реплике выше. Напишите одно-два слова в каждый пропуск.","Міндеттілік жоғарыдағы соңғы репликада оралды. Әр бос орынға бір-екі сөз жазыңыз."],
u2439a:["6 · Постройте вопрос. Нажимайте слова в правильном порядке.","6 · Сұрақты құрыңыз. Сөздерді дұрыс ретпен басыңыз."],
u2440a:["1 · Послушайте один раз. Где происходит каждый разговор?","1 · Бір рет тыңдаңыз. Әр әңгіме қайда өтіп жатыр?"],
u2441a:["Не пытайтесь поймать каждое слово. Сначала найдите место.","Әр сөзді ұстауға тырыспаңыз. Алдымен орнын табыңыз."],
u2442a:["Нажмите на кнопку, чтобы услышать один разговор отдельно.","Бір әңгімені бөлек тыңдау үшін түймені басыңыз."],
u2443a:["2 · Послушайте ещё раз. Какой это разговор? Выберите 1, 2 или 3.","2 · Қайта тыңдаңыз. Бұл қай әңгіме? 1, 2 немесе 3 таңдаңыз."],
u2444a:["3 · Послушайте фразу. В каком разговоре вы её слышите?","3 · Тіркесті тыңдаңыз. Оны қай әңгімеде естисіз?"],
u2445a:["Полезные фразы","Пайдалы тіркестер"],
u2446a:["Обсудите","Талқылаңыз"],
u2447a:["Послушайте звонок о бронировании. Сотрудница заполняет анкету, пока говорит.","Брондау туралы қоңырауды тыңдаңыз. Қызметкер сөйлесіп отырып сауалнаманы толтырады."],
u2448a:["Включите часть 2 ради личных данных. Затем заполните анкету ниже.","Жеке деректер үшін 2-бөлікті қосыңыз. Содан кейін төмендегі сауалнаманы толтырыңыз."],
u2449a:["1 · Послушайте часть 1. Ответьте на вопросы.","1 · 1-бөлікті тыңдаңыз. Сұрақтарға жауап беріңіз."],
u2450a:["2 · Послушайте часть 2 и заполните анкету.","2 · 2-бөлікті тыңдап, сауалнаманы толтырыңыз."],
u2451a:["Пишите ровно то, что слышите. Часть 2 можно включать сколько нужно.","Дәл естігеніңізді жазыңыз. 2-бөлікті қажет болғанша қосуға болады."],
u2452a:["3 · Звонящий не понимает две вещи. Что он говорит?","3 · Қоңырау шалушы екі нәрсені түсінбейді. Ол не дейді?"],
u2453a:["Теперь изучите образец","Енді үлгіні зерттеңіз"],
u2454a:["Следующие три задания не о том, что написано в анкете, а о том, как она устроена — потому что вы заполните точно такую же.","Келесі үш тапсырма сауалнамада не жазылғаны туралы емес, ол қалай құрылғаны туралы."],
u2455a:["4 · СТРУКТУРА. Для чего каждый раздел анкеты? Расставьте их в том порядке, в каком они идут.","4 · ҚҰРЫЛЫМ. Әр бөлім не үшін? Оларды ретімен қойыңыз."],
u2456a:["5 · ПОЛЕЗНЫЕ СЛОВА. Найдите в анкете слово, которое выполняет каждую задачу.","5 · ПАЙДАЛЫ СӨЗДЕР. Сауалнамадан әр қызметті атқаратын сөзді табыңыз."],
u2457a:["Скопируйте его точно так, как оно написано. Эти слова есть в любой анкете.","Дәл жазылғандай көшіріңіз. Бұл сөздер кез келген сауалнамада бар."],
u2458a:["6 · РЕГИСТР. Анкета и сообщение звучат по-разному. Что уместно в анкете?","6 · РЕГИСТР. Сауалнама мен хабарлама әртүрлі естіледі. Сауалнамаға не жарайды?"],
u2459a:["Оба варианта — правильный английский. Но в официальной анкете уместен только один.","Екеуі де дұрыс ағылшын тілі. Бірақ ресми сауалнамаға тек біреуі жарайды."],
u2460a:["7 · Послушайте часть 3. Что Адам должен сделать перед поездкой?","7 · 3-бөлікті тыңдаңыз. Адам сапарға дейін не істеуі керек?"],
u2461a:["Три из шести есть в записи. Трёх нет.","Алтаудың үшеуі жазбада бар. Үшеуі жоқ."],
u2462a:["Полезные фразы — держите открытыми","Пайдалы тіркестер — ашық ұстаңыз"],
u2463a:["1 · Работайте в парах. Возьмите карточку. Не показывайте её партнёру.","1 · Жұпта жұмыс істеңіз. Картаны алыңыз. Оны серіктесіңізге көрсетпеңіз."],
u2464a:["Студент A звонит. Студент B записывает данные и заполняет анкету. Используйте минимум три фразы из блока.","А студенті қоңырау шалады. B студенті деректерді жазып, сауалнаманы толтырады."],
u2465a:["Проведите один раз. Не останавливайтесь на ошибках.","Бір рет өткізіңіз. Қателерге тоқтамаңыз."],
u2466a:["2 · Поменяйтесь карточками и повторите.","2 · Карталарды ауыстырып, қайталаңыз."],
u2467a:["Это и есть главный прогон. Используйте две фразы, которых не было в первый раз.","Ең маңыздысы осы. Бірінші ретте болмаған екі тіркесті қолданыңыз."],
u2468a:["Во второй раз сотрудник говорит быстрее и использует одно слово, которого звонящий не знает.","Екінші ретте қызметкер жылдамырақ сөйлеп, қоңырау шалушы білмейтін бір сөзді қолданады."],
u2469a:["Преподавателю","Мұғалімге"],
u2470a:["1 · Возьмите первую карточку. Преподаватель берёт вторую.","1 · Бірінші картаны алыңыз. Мұғалім екіншісін алады."],
u2471a:["Вы звоните; преподаватель записывает данные и заполняет анкету. Используйте минимум три фразы из блока.","Сіз қоңырау шаласыз; мұғалім деректерді жазады. Кемінде үш тіркесті қолданыңыз."],
u2472a:["2 · Поменяйтесь карточками и повторите.","2 · Карталарды ауыстырып, қайталаңыз."],
u2473a:["Это и есть главный прогон. Используйте две фразы, которых не было в первый раз.","Ең маңыздысы осы. Бірінші ретте болмаған екі тіркесті қолданыңыз."],
u2474a:["Преподавателю: во второй раз говорите быстрее и вставьте слово, которого студент не знает, чтобы фраза уточнения действительно понадобилась.","Мұғалімге: екінші ретте жылдамырақ сөйлеп, студент білмейтін сөзді қосыңыз."],
u2475a:["1 · Заполните анкету на себя.","1 · Сауалнаманы өзіңізге толтырыңыз."],
u2476a:["Та же форма, что у Адама. Пишите печатными заглавными. Что не хотите писать — придумайте.","Адамдікі сияқты. Бас әріптермен жазыңыз. Жазғыңыз келмегенін ойдан құрастырыңыз."],
u2477a:["3 · Теперь заполните анкету на себя.","3 · Енді сауалнаманы өзіңізге толтырыңыз."],
u2478a:["Та же форма, что у Адама. Пишите печатными заглавными.","Адамдікі сияқты. Бас әріптермен жазыңыз."],
u2479a:["4 · Поменяйтесь анкетами и проверьте.","4 · Сауалнамаларды ауыстырып тексеріңіз."],
u2480a:["2 · Напишите сообщение, которое вы отправляете после звонка.","2 · Қоңыраудан кейін жіберетін хабарламаны жазыңыз."],
u2481a:["Около 70 слов. Подтвердите бронь, спросите одно, чего не поняли по телефону, и уточните одно, что нужно сделать до поездки.","Шамамен 70 сөз. Брондауды растаңыз, түсінбеген бір нәрсені сұраңыз."],
u2482a:["3 · Проверьте черновик, прежде чем закончить.","3 · Аяқтамас бұрын жобаны тексеріңіз."],
u2485a:["Отметьте всё, что вы теперь умеете.","Енді не істей алатыныңыздың бәрін белгілеңіз."],
/* ---- Units 5-6 ---- */
w1301:["Выберите ровно пять. Нажмите, чтобы положить вещь в коробку, нажмите ещё раз — чтобы вынуть.","Дәл бесеуін таңдаңыз. Затты жәшікке салу үшін басыңыз, алып тастау үшін қайта басыңыз."],
w1302:["Правильного ответа нет. Трудно именно остановиться на пяти.","Дұрыс жауап жоқ. Қиыны — бесеуімен шектелу."],
w1303:["Сравните","Салыстырыңыз"],
w1304:["Работайте в парах. Какую вещь было тяжелее всего не взять? Почему?","Жұппен жұмыс істеңіз. Қай затты қалдыру қиын болды? Неге?"],
w1305:["Найдите одну вещь, которую выбрали оба, и одну, которую выбрали только вы.","Екеуің де таңдаған бір затты және тек өзіңіз таңдаған бір затты табыңыз."],
w1306:["Расскажите преподавателю, какую вещь было тяжелее всего не взять и почему.","Мұғалімге қай затты қалдыру қиын болғанын және неге екенін айтыңыз."],
w1307:["Запишите","Жазып қойыңыз"],
w1308:["Напишите свои пять вещей списком. Затем одно предложение о той, которую оставили за бортом.","Бес затыңызды тізіммен жазыңыз. Содан соң қалдырғаныңыз туралы бір сөйлем жазыңыз."],
t1301:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
t1302:["Показать перевод","Аудармасын көрсету"],
v1301:["3 · Соотнесите каждое слово с его значением.","3 · Әр сөзді мағынасымен сәйкестендіріңіз."],
v1302:["4 · Из чего это сделано?","4 · Бұл неден жасалған?"],
v1303:["5 · Выберите противоположность.","5 · Қарама-қарсы сөзді таңдаңыз."],
v1304:["6 · Послушайте. Какая часть слова звучит сильнее?","6 · Тыңдаңыз. Сөздің қай бөлігі күштірек естіледі?"],
v1305:["В английском в каждом слове один сильный удар. Ошибка в ударении — главная причина, по которой слово не понимают.","Ағылшыншада әр сөзде бір күшті екпін бар. Екпіндегі қате — сөздің түсініксіз болуының басты себебі."],
v1306:["Теперь послушайте те же восемь слов медленно и повторите за записью.","Енді сол сегіз сөзді баяу тыңдап, жазбадан кейін қайталаңыз."],
v1307:["7 · Дополните описание предмета.","7 · Заттың сипаттамасын толықтырыңыз."],
v1308:["8 · Работайте в парах. Две минуты.","8 · Жұппен жұмыс істеңіз. Екі минут."],
v1309:["Студент A описывает предмет в комнате, не называя его, используя три слова из этапа 2. Студент B угадывает. Затем поменяйтесь. Отметьте выполненным, когда у каждого будет по четыре хода.","A студент 2-кезеңдегі үш сөзді қолданып, бөлмедегі затты атамай сипаттайды. B студент табады. Содан соң ауысыңыздар. Әрқайсың төрт реттен өткенде орындалды деп белгілеңіз."],
v1310:["Не останавливайтесь на ошибках. Запишите их и разберите вместе в конце.","Қателерге тоқтамаңыз. Жазып алып, соңында бірге талдаңыз."],
v1311:["8 · Две минуты с преподавателем.","8 · Мұғаліммен екі минут."],
v1312:["Опишите предмет в комнате, не называя его, используя три слова из этапа 2. Преподаватель угадывает. Затем он описывает, а вы угадываете.","2-кезеңдегі үш сөзді қолданып, бөлмедегі затты атамай сипаттаңыз. Мұғалім табады. Содан соң ол сипаттайды, сіз табасыз."],
v1313:["Преподавателю: фиксируйте ошибки, но не прерывайте дрилл.","Мұғалімге: қателерді жазып отырыңыз, бірақ жаттығуды үзбеңіз."],
v1314:["8 · Опишите один предмет рядом с вами, используя четыре слова из этапа 2.","8 · Жаныңыздағы бір затты 2-кезеңдегі төрт сөзбен сипаттаңыз."],
v1315:["Сохраните это \u2014 оно понадобится для письменного задания.","Мұны сақтаңыз \u2014 жазба тапсырмасына керек болады."],
g1301:["Прочитайте эти четыре предложения из записи этапа 5.","5-кезеңдегі жазбадан алынған осы төрт сөйлемді оқыңыз."],
g1302:["Почему в первом предложении a ring, а во втором the ring?","Неге бірінші сөйлемде a ring, ал екіншісінде the ring?"],
g1303:["Выбор из трёх","Үшеуінің біреуін таңдау"],
g1304:["Правила, которые важны","Маңызды ережелер"],
g1305:["Первое упоминание → a / an. Дальше та же вещь идёт с the. Одна эта схема покрывает большую часть речи.","Алғаш аталғанда → a / an. Одан кейін сол зат the-мен келеді. Осы бір үлгі сөйлеудің көбін қамтиды."],
g1306:["Исчисляемое существительное в единственном числе почти никогда не стоит без артикля. It's ring — неверно; It's a ring — верно.","Жекеше саналатын зат есім артикльсіз тұрмайды. It's ring — қате; It's a ring — дұрыс."],
g1307:["Множественное или неисчисляемое в общем смысле → без артикля: I love antique jewellery, made of leather.","Көпше не саналмайтын, жалпы мағынада → артикльсіз: I love antique jewellery, made of leather."],
g1308:["an или a зависит от звука, а не от буквы: an hour, a useful tool.","an не a әріпке емес, дыбысқа байланысты: an hour, a useful tool."],
g1309:["Глагольные конструкции вы проходили в юните 4. Они вернутся в задании 5 следующего этапа.","Етістік құрылымдарын 4-юнитте өткенсіз. Олар келесі кезеңнің 5-тапсырмасында оралады."],
p1301:["1 · Выберите правильный артикль.","1 · Дұрыс артикльді таңдаңыз."],
p1302:["2 · Дополните a, an, the или оставьте пустым.","2 · a, an, the қойыңыз немесе бос қалдырыңыз."],
p1303:["Если артикль не нужен, поставьте дефис: –","Артикль қажет болмаса, дефис қойыңыз: –"],
p1304:["3 · В каждом предложении одно слово лишнее или неверное. Нажмите на него.","3 · Әр сөйлемде бір сөз артық не қате. Соны басыңыз."],
p1305:["4 · Соедините два предложения в короткое описание.","4 · Екі сөйлемді қысқа сипаттамаға біріктіріңіз."],
p1306:["В первый раз используйте a / an, во второй — the.","Бірінші рет a / an, екінші рет the қолданыңыз."],
p1307:["5 · повтор Глагольные конструкции снова — юнит 4. Выберите правильную форму.","5 · қайталау Етістік құрылымдары тағы да — 4-юнит. Дұрыс форманы таңдаңыз."],
p1308:["6 · повтор Послушайте каждый набор из четырёх слов. Какое лишнее?","6 · қайталау Төрт сөзден тұратын әр топты тыңдаңыз. Қайсысы артық?"],
l1301:["Перед прослушиванием. Что из этого, по-вашему, назовут любимой вещью?","Тыңдамас бұрын. Сіздіңше, қайсысын сүйікті зат деп атайды?"],
l1302:["1 · Послушайте. Какая любимая вещь у каждого?","1 · Тыңдаңыз. Әрқайсысының сүйікті заты қандай?"],
l1303:["2 · Послушайте снова, по одному говорящему. Верно или неверно?","2 · Қайта тыңдаңыз, бір-бірден. Дұрыс па, бұрыс па?"],
l1304:["3 · Кто это говорит? При необходимости послушайте ещё раз.","3 · Мұны кім айтады? Қажет болса тағы тыңдаңыз."],
l1305:["4 · Пара решает, от чего избавиться. Послушайте и ответьте.","4 · Жұп неден құтылу керегін шешеді. Тыңдап, жауап беріңіз."],
l1306:["Три предмета, три решения.","Үш зат, үш шешім."],
s1301:["Полезные фразы","Пайдалы сөз тіркестері"],
s1302:["1 · Работайте в парах. Возьмите карточку. Описывайте предмет минуту, не называя его. Затем поменяйтесь карточками.","1 · Жұппен жұмыс істеңіз. Карта алыңыз. Затты атамай бір минут сипаттаңыз. Содан соң карталарды ауыстырыңыз."],
s1303:["Партнёр должен задать два вопроса до того, как вы назовёте предмет.","Затты атамас бұрын серіктесіңіз екі сұрақ қоюы керек."],
s1304:["2 · Смените партнёра. Опишите предмет первого партнёра по памяти.","2 · Серіктесті ауыстырыңыз. Бірінші серіктесіңіздің затын жадыңыздан сипаттаңыз."],
s1305:["Преподавателю: после смены дайте обратную связь — одна удачная фраза, одна для следующего раза. Слушайте пропущенные артикли.","Мұғалімге: ауысқаннан кейін кері байланыс беріңіз — бір сәтті тіркес, бір келесі жолға. Түсіп қалған артикльдерді тыңдаңыз."],
s1306:["1 · Возьмите карточку и описывайте предмет преподавателю минуту, не называя его. Затем возьмите вторую карточку.","1 · Карта алып, мұғалімге затты атамай бір минут сипаттаңыз. Содан соң екінші картаны алыңыз."],
s1307:["Преподавателю: задайте два вопроса, прежде чем студент назовёт предмет. Фиксируйте пропущенные артикли.","Мұғалімге: студент затты атамас бұрын екі сұрақ қойыңыз. Түсіп қалған артикльдерді жазып отырыңыз."],
s1308:["2 · Преподаватель описывает предмет. Задайте четыре вопроса и угадайте, что это.","2 · Мұғалім затты сипаттайды. Төрт сұрақ қойып, не екенін табыңыз."],
s1309:["Преподавателю: обратная связь после обоих кругов, не во время.","Мұғалімге: кері байланыс екі айналымнан кейін, барысында емес."],
s1310:["1 · Напишите о своей любимой вещи.","1 · Сүйікті затыңыз туралы жазыңыз."],
s1311:["Около 70–90 слов. Начните с a / an, затем используйте the для того же предмета. Скажите, из чего он, как выглядит и почему важен.","Шамамен 70–90 сөз. a / an-мен бастап, сол зат үшін the қолданыңыз. Неден жасалғанын, қандай көрінетінін және неге маңызды екенін айтыңыз."],
s1312:["3 · Обсудите.","3 · Талқылаңыз."],
s1313:["Напишите два-три предложения на каждый вопрос.","Әр сұраққа екі-үш сөйлем жазыңыз."],
z1304:["Следующий урок","Келесі сабақ"],
z1305:["It's all about the money — трое людей, которые тратят, копят и теряют деньги, и слова для «сколько».","It's all about the money — ақшаны жұмсайтын, жинайтын және шашатын үш адам, және «қанша» деген сөздер."],
w1401:["Сколько типичной месячной зарплаты уходит на каждый пункт? Выберите свою догадку.","Айлық жалақының қаншасы әрқайсысына кетеді? Өз болжамыңызды таңдаңыз."],
w1402:["Правильного ответа нет. Важно, чтобы к следующему этапу у вас в голове было число.","Дұрыс жауап жоқ. Келесі кезеңге дейін ойыңызда сан болғаны маңызды."],
w1403:["Сравните","Салыстырыңыз"],
w1404:["Работайте в парах. Где догадки разошлись сильнее всего? Как думаете, почему?","Жұппен жұмыс істеңіз. Болжамдар қай жерде көбірек алшақтады? Неге деп ойлайсыз?"],
w1405:["Что из пяти труднее всего контролировать?","Бесеуінің қайсысын бақылау ең қиын?"],
w1406:["Сравните догадки с преподавателем. Где вы разошлись сильнее всего?","Болжамдарыңызды мұғаліммен салыстырыңыз. Қай жерде көбірек алшақтадыңыздар?"],
w1407:["Запишите","Жазып қойыңыз"],
w1408:["Напишите одно предложение о догадке, в которой вы меньше всего уверены.","Ең сенімсіз болжамыңыз туралы бір сөйлем жазыңыз."],
t1401:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
t1402:["Показать перевод","Аудармасын көрсету"],
v1401:["3 · Соотнесите каждое слово с его значением.","3 · Әр сөзді мағынасымен сәйкестендіріңіз."],
v1402:["4 · Эти две пары путают чаще всего. Выберите правильное слово.","4 · Осы екі жұпты жиі шатастырады. Дұрыс сөзді таңдаңыз."],
v1403:["5 · Дополните предложения.","5 · Сөйлемдерді толықтырыңыз."],
v1404:["6 · Работайте в парах. Две минуты.","6 · Жұппен жұмыс істеңіз. Екі минут."],
v1405:["Студент A называет слово из этапа 2. У студента B десять секунд, чтобы употребить его в правдивом предложении о своей жизни. Затем поменяйтесь. Отметьте выполненным, когда у каждого будет по четыре хода.","A студент 2-кезеңнен сөз айтады. B студентте оны өз өмірі туралы шын сөйлемде қолдануға он секунд бар. Содан соң ауысыңыздар. Әрқайсың төрт реттен өткенде орындалды деп белгілеңіз."],
v1406:["Настоящие цифры называть не нужно. Достаточно a lot и not much.","Нақты сандарды атаудың қажеті жоқ. a lot және not much жеткілікті."],
v1407:["6 · Две минуты с преподавателем.","6 · Мұғаліммен екі минут."],
v1408:["Преподаватель называет слово из этапа 2. У вас десять секунд, чтобы употребить его в правдивом предложении. Затем вы называете слово, а отвечает преподаватель.","Мұғалім 2-кезеңнен сөз айтады. Сізде оны шын сөйлемде қолдануға он секунд бар. Содан кейін сіз сөз айтасыз, мұғалім жауап береді."],
v1409:["Преподавателю: фиксируйте ошибки, но не прерывайте дрилл.","Мұғалімге: қателерді жазып отырыңыз, бірақ жаттығуды үзбеңіз."],
v1410:["6 · Напишите по одному правдивому предложению для пяти слов.","6 · Бес сөзге бір-бір шын сөйлем жазыңыз."],
v1411:["Настоящие цифры называть не нужно.","Нақты сандарды атаудың қажеті жоқ."],
g1401:["Прочитайте эти четыре предложения из текста этапа 5.","5-кезеңдегі мәтіннен алынған осы төрт сөйлемді оқыңыз."],
g1402:["Почему a little money, но a few dinners?","Неге a little money, бірақ a few dinners?"],
g1403:["Исчисляемое, неисчисляемое и слова, которые идут с каждым","Саналатын, саналмайтын және әрқайсысымен келетін сөздер"],
g1404:["Правила, которые важны","Маңызды ережелер"],
g1405:["Сначала спросите: можно ли поставить перед словом число? three coins — да, three moneys — нет. Этот один вопрос решает much/many, a little/a few и too much/too many.","Алдымен сұраңыз: сөздің алдына сан қоюға бола ма? three coins — иә, three moneys — жоқ. Осы бір сұрақ much/many, a little/a few және too much/too many-ді шешеді."],
g1406:["money, time, information, advice, news, work в английском неисчисляемые, даже если в вашем языке их считают.","money, time, information, advice, news, work ағылшыншада саналмайды, сіздің тіліңізде саналса да."],
g1407:["В утвердительном предложении лучше a lot of: говорите I have a lot of work, а не I have much work. much и many живут в отрицаниях и вопросах.","Болымды сөйлемде a lot of жақсы: I have a lot of work деңіз, I have much work емес. much пен many болымсыз бен сұрақта тұрады."],
g1408:["too much / too many значит, что это проблема. not enough значит, что меньше, чем нужно. Это противоположности.","too much / too many — бұл мәселе дегені. not enough — қажеттіден аз дегені. Бұлар қарама-қарсы."],
g1409:["Артикли вы проходили в уроке 13. Они вернутся в задании 5 следующего этапа.","Артикльдерді 13-сабақта өткенсіз. Олар келесі кезеңнің 5-тапсырмасында оралады."],
p1401:["1 · Исчисляемое или неисчисляемое?","1 · Саналады ма, саналмайды ма?"],
p1402:["2 · Выберите правильное слово.","2 · Дұрыс сөзді таңдаңыз."],
p1403:["3 · Дополните одним словом.","3 · Бір сөзбен толықтырыңыз."],
p1404:["В каждый пропуск идёт much, many, few, little, enough, some или any.","Әр бос орынға much, many, few, little, enough, some не any келеді."],
p1405:["4 · В каждом предложении одно слово неверно. Нажмите на него.","4 · Әр сөйлемде бір сөз қате. Соны басыңыз."],
p1406:["5 · повтор Артикли снова — урок 13. Выберите правильный.","5 · қайталау Артикльдер тағы да — 13-сабақ. Дұрысын таңдаңыз."],
p1407:["6 · Сделайте правдивым для себя.","6 · Өзіңізге шындық етіңіз."],
p1408:["Напишите три предложения: одно с too much / too many, одно с not enough, одно с a few или a little.","Үш сөйлем жазыңыз: біреуі too much / too many, біреуі not enough, біреуі a few не a little."],
r1401:["Перед чтением. Описаны трое людей. Что, по-вашему, у них общего?","Оқымас бұрын. Үш адам сипатталған. Сіздіңше, олардың ортақ несі бар?"],
r1402:["1 · Прочитайте быстро. Кто это?","1 · Жылдам оқыңыз. Бұл кім?"],
r1403:["2 · Прочитайте снова. Верно или неверно?","2 · Қайта оқыңыз. Дұрыс па, бұрыс па?"],
r1404:["3 · Найдите в тексте слово, которое значит…","3 · Мәтіннен мына мағынадағы сөзді табыңыз…"],
r1405:["4 · Что из этого встречается в тексте? Выберите всё.","4 · Мәтінде қайсысы кездеседі? Барлығын таңдаңыз."],
r1406:["5 · Обсудите.","5 · Талқылаңыз."],
r1407:["Напишите два-три предложения на каждый вопрос.","Әр сұраққа екі-үш сөйлем жазыңыз."],
s1401:["Полезные фразы","Пайдалы сөз тіркестері"],
s1402:["1 · Работайте в парах. Возьмите карточку и отвечайте минуту. Затем поменяйтесь карточками.","1 · Жұппен жұмыс істеңіз. Карта алып, бір минут жауап беріңіз. Содан соң карталарды ауыстырыңыз."],
s1403:["Настоящие цифры называть не нужно. Важны слова количества.","Нақты сандар қажет емес. Мөлшер сөздері маңызды."],
s1404:["2 · Смените партнёра. Расскажите, на что первый партнёр тратит слишком много.","2 · Серіктесті ауыстырыңыз. Бірінші серіктесіңіз неге тым көп жұмсайтынын айтыңыз."],
s1405:["Преподавателю: после смены дайте обратную связь — одна удачная фраза, одна для следующего раза. Слушайте much в утвердительных предложениях.","Мұғалімге: ауысқаннан кейін кері байланыс беріңіз — бір сәтті тіркес, бір келесі жолға. Болымды сөйлемдегі much-ты тыңдаңыз."],
s1406:["1 · Возьмите карточку A и расспросите преподавателя. Затем возьмите карточку B и отвечайте.","1 · A картасын алып, мұғалімнен сұраңыз. Содан соң B картасын алып, жауап беріңіз."],
s1407:["Преподавателю: отвечайте коротко, чтобы студенту приходилось спрашивать дальше.","Мұғалімге: қысқа жауап беріңіз, студент сұрай беруі керек."],
s1408:["2 · Расскажите преподавателю об одной вещи, на которую тратите слишком много, и одной, которой всегда не хватает.","2 · Мұғалімге тым көп жұмсайтын бір нәрсе және әрқашан жетпейтін бір нәрсе туралы айтыңыз."],
s1409:["Преподавателю: обратная связь в конце, не во время.","Мұғалімге: кері байланыс соңында, барысында емес."],
s1410:["1 · Ответьте про свою жизнь. По два предложения на каждый пункт.","1 · Өз өміріңіз туралы жауап беріңіз. Әрқайсысына екі сөйлемнен."],
s1411:["2 · Напишите короткий абзац с советом для Тимура.","2 · Тимурға кеңес беретін қысқа абзац жазыңыз."],
s1412:["Около 60–80 слов. Используйте минимум одно too much / too many, одно not enough и одно a few или a little.","Шамамен 60–80 сөз. Кемінде бір too much / too many, бір not enough және бір a few не a little қолданыңыз."],
z1404:["Следующий урок","Келесі сабақ"],
z1405:["This isn't what I ordered — как описать забытое слово и как написать письмо, которое вернёт вам деньги.","This isn't what I ordered — ұмытылған сөзді қалай сипаттау және ақшаңызды қайтаратын хатты қалай жазу."],
w1501:["Прочитайте каждое описание и выберите предмет.","Әр сипаттаманы оқып, затты таңдаңыз."],
w1502:["Описывать пока ничего не нужно. Просто узнайте предмет.","Әзірге ештеңе сипаттаудың қажеті жоқ. Тек затты танып алыңыз."],
w1503:["Обсудите","Талқылаңыз"],
w1504:["Работайте в парах. Какое описание было самым лёгким? Какое самым трудным? Почему?","Жұппен жұмыс істеңіз. Қай сипаттама оңай болды? Қайсысы қиын? Неге?"],
w1505:["Когда вы последний раз забывали слово по-английски и приходилось объяснять?","Ағылшынша сөзді ұмытып, түсіндіруге тура келген соңғы кез қашан болды?"],
w1506:["Расскажите преподавателю, когда вы последний раз забыли слово по-английски и объясняли его другими словами.","Мұғалімге ағылшынша сөзді ұмытып, оны басқа сөзбен түсіндірген соңғы кезіңізді айтыңыз."],
w1507:["Запишите","Жазып қойыңыз"],
w1508:["Напишите об одном случае, когда вы забыли слово по-английски. Что вы сказали вместо него?","Ағылшынша сөзді ұмытқан бір жағдай туралы жазыңыз. Оның орнына не дедіңіз?"],
t1501:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
t1502:["Показать перевод","Аудармасын көрсету"],
v1501:["3 · Соотнесите каждое слово с его значением.","3 · Әр сөзді мағынасымен сәйкестендіріңіз."],
v1502:["4 · Какую работу выполняет каждая фраза?","4 · Әр тіркес қандай қызмет атқарады?"],
v1503:["5 · Дополните предложения.","5 · Сөйлемдерді толықтырыңыз."],
g1501:["Прочитайте эти четыре строки из записей этапа 5.","5-кезеңдегі жазбалардан алынған осы төрт жолды оқыңыз."],
g1502:["Какие две говорят одно и то же разными словами?","Қай екеуі бір нәрсені әртүрлі сөзбен айтады?"],
g1503:["Четыре хода, именно в этом порядке","Төрт қадам, дәл осы ретпен"],
g1504:["Правила, которые важны","Маңызды ережелер"],
g1505:["Начинайте с группы, а не с детали. It's a kind of tool говорит слушателю больше, чем три предложения о форме.","Детальден емес, топтан бастаңыз. It's a kind of tool тыңдаушыға пішін туралы үш сөйлемнен көбірек айтады."],
g1506:["Две конструкции, две формы: use it to + инфинитив, но used for + -ing. Их смешение — самая частая ошибка на этом уровне.","Екі құрылым, екі форма: use it to + инфинитив, бірақ used for + -ing. Оларды шатастыру — осы деңгейдегі ең жиі қате."],
g1507:["which и that после a thing оба верны. Но не говорите a thing what.","a thing-тен кейін which те, that та дұрыс. Бірақ a thing what демеңіз."],
g1508:["Всегда возвращайте ход собеседнику. Описание, которое заканчивается на Do you know what I mean?, получает ответ; то, которое просто обрывается, — нет.","Кезекті әрқашан әңгімелесушіге қайтарыңыз. Do you know what I mean? деп аяқталған сипаттама жауап алады; жай үзілгені — жоқ."],
g1509:["Всё, что вы построили в уроках 13 и 14 — артикли и квантификаторы — живёт внутри этих описаний.","13 және 14-сабақта жинағаныңыздың бәрі — артикльдер мен квантификаторлар — осы сипаттамалардың ішінде."],
p1501:["1 · Выберите правильную форму.","1 · Дұрыс форманы таңдаңыз."],
p1502:["2 · Дополните каждое описание одним словом.","2 · Әр сипаттаманы бір сөзбен толықтырыңыз."],
p1503:["3 · В каждом предложении одно слово неверно. Нажмите на него.","3 · Әр сөйлемде бір сөз қате. Соны басыңыз."],
p1504:["4 · Прочитайте описание и назовите предмет.","4 · Сипаттаманы оқып, затты атаңыз."],
p1505:["5 · повтор Артикли и квантификаторы вместе. Выберите правильное слово.","5 · қайталау Артикльдер мен квантификаторлар бірге. Дұрыс сөзді таңдаңыз."],
n1501:["1 · Послушайте три разговора. Что ищет каждый покупатель?","1 · Үш әңгімені тыңдаңыз. Әр сатып алушы не іздеп жүр?"],
n1502:["2 · Послушайте снова. Верно или неверно?","2 · Қайта тыңдаңыз. Дұрыс па, бұрыс па?"],
n1503:["3 · Послушайте восемь фраз. Для чего каждая из них?","3 · Сегіз тіркесті тыңдаңыз. Әрқайсысы не үшін?"],
n1504:["Теперь послушайте те же фразы медленнее и повторите за записью.","Енді сол тіркестерді баяу тыңдап, жазбадан кейін қайталаңыз."],
n1505:["4 · Ещё один. Что нужно говорящему?","4 · Тағы біреуі. Сөйлеушіге не керек?"],
n1506:["Полезные фразы","Пайдалы сөз тіркестері"],
n1507:["5 · Прочитайте образец письма. Именно это вы напишете на следующем этапе.","5 · Хаттың үлгісін оқыңыз. Дәл осыны келесі кезеңде жазасыз."],
n1508:["6 · Что делает каждый абзац? Расставьте пять шагов по порядку.","6 · Әр абзац не істейді? Бес қадамды ретімен қойыңыз."],
n1509:["7 · Найдите в образце фразу, которая…","7 · Үлгіден мына тіркесті табыңыз…"],
n1510:["8 · Регистр. Какой вариант подходит для письма в компанию?","8 · Стиль. Компанияға жазатын хатқа қай нұсқа келеді?"],
s1501:["1 · Работайте в парах. Возьмите карточку. Описывайте предмет, не называя его, пока партнёр не угадает. Затем поменяйтесь.","1 · Жұппен жұмыс істеңіз. Карта алыңыз. Серіктесіңіз тапқанша затты атамай сипаттаңыз. Содан соң ауысыңыздар."],
s1502:["Никаких жестов и показывания пальцем. Только слова.","Ешқандай ым, нұсқау жоқ. Тек сөз."],
s1503:["1 · Вы покупатель. Опишите каждый предмет преподавателю, не называя его. Затем поменяйтесь ролями.","1 · Сіз — сатып алушысыз. Әр затты мұғалімге атамай сипаттаңыз. Содан соң рөлдерді ауыстырыңыз."],
s1504:["Преподавателю: не угадывайте слишком рано. Пусть студент выполнит все четыре хода.","Мұғалімге: тым ерте таппаңыз. Студент төрт қадамды да жасасын."],
s1505:["1 · Опишите каждый предмет тремя предложениями, не используя его название.","1 · Әр затты атауын қолданбай үш сөйлеммен сипаттаңыз."],
s1506:["2 · Теперь напишите письмо с жалобой.","2 · Енді шағым хатын жазыңыз."],
s1507:["Вы заказали что-то онлайн, и пришло не то. Около 100–120 слов. Следуйте пяти шагам из образца.","Онлайн бірдеңе тапсырыс бердіңіз, бірақ басқа нәрсе келді. Шамамен 100–120 сөз. Үлгідегі бес қадамды ұстаныңыз."],
s1508:["Ваш план","Жоспарыңыз"],
s1509:["1 Dear Sir or Madam — I am writing to complain about…","1 Dear Sir or Madam — I am writing to complain about…"],
s1510:["2 Что вы заказали и когда","2 Не тапсырыс бердіңіз және қашан"],
s1511:["3 Что с этим не так — используйте too, not enough, in poor condition","3 Не дұрыс емес — too, not enough, in poor condition қолданыңыз"],
s1512:["4 Что вы уже сделали","4 Не істеп қойдыңыз"],
s1513:["5 I would like a full refund — I look forward to your reply — Yours faithfully","5 I would like a full refund — I look forward to your reply — Yours faithfully"],
s1514:["Преподаватель прочитает это после устного задания.","Мұғалім мұны ауызша тапсырмадан кейін оқиды."],
s1515:["Сохраните. Перечитайте ещё раз перед тем, как закончить.","Сақтап қойыңыз. Аяқтамас бұрын тағы бір рет оқып шығыңыз."],
s1516:["3 · Проверьте своё письмо.","3 · Хатыңызды тексеріңіз."],
z1504:["Юнит 5 закончен","5-юнит аяқталды"],
z1505:["Вы прошли артикли, квантификаторы и две вещи, которые реально нужны в магазине: как описать то, что вам нужно, и как вернуть деньги, когда что-то пошло не так.","Артикльдерді, квантификаторларды және дүкенде шынымен керек екі нәрсені өттіңіз: не керегін қалай сипаттау және бірдеңе дұрыс болмағанда ақшаны қалай қайтару."],
w1601:["Прочитайте каждую пару. Нажмите на тот вариант, который вам ближе.","Әр жұпты оқыңыз. Өзіңізге жақын нұсқаны басыңыз."],
w1602:["Никто не бывает на сто процентов A или B. Выберите то, что случается чаще.","Ешкім жүз пайыз A немесе B емес. Жиірек болатынын таңдаңыз."],
w1603:["Посчитайте","Санап шығыңыз"],
w1604:["Чаще первый ответ, чаще второй или поровну? Запомните результат — в пятом этапе текст даст название обоим типам.","Көбіне бірінші жауап па, екінші ме, әлде аралас па? Нәтижені есте сақтаңыз — 5-кезеңдегі мәтін екі түрге де ат береді."],
w1605:["Запишите","Жазып қойыңыз"],
w1606:["Напишите одно предложение о своём результате. Вы вернётесь к нему в последнем этапе.","Нәтижеңіз туралы бір сөйлем жазыңыз. Соңғы кезеңде оған ораласыз."],
w1607:["Сравните","Салыстырыңыз"],
w1608:["Работайте в парах. Найдите один вопрос с одинаковым ответом и один с разным.","Жұппен жұмыс істеңіз. Жауаптарың бірдей бір сұрақты және әртүрлі бір сұрақты табыңыз."],
w1609:["Затем расскажите классу о партнёре одним предложением. Имя не называйте.","Содан соң сыныпқа серіктесіңіз туралы бір сөйлеммен айтыңыз. Атын атамаңыз."],
w1610:["Сравните с преподавателем: один вопрос с одинаковым ответом и один с разным.","Мұғаліммен салыстырыңыз: жауаптары бірдей бір сұрақ және әртүрлі бір сұрақ."],
t1601:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
t1602:["Показать перевод","Аудармасын көрсету"],
v1601:["3 · Соотнесите каждое слово с его значением.","3 · Әр сөзді мағынасымен сәйкестендіріңіз."],
v1602:["4 · Эти два слова значат одно и то же? Выберите similar или different.","4 · Бұл екі сөз бір мағына бере ме? similar не different таңдаңыз."],
v1603:["Именно эту пару путают чаще всего, поэтому прочитайте оба слова до выбора.","Дәл осы жұпты жиі шатастырады, сондықтан таңдамас бұрын екі сөзді де оқыңыз."],
v1604:["5 · Одно слово лишнее. Нажмите на него.","5 · Бір сөз артық. Соны басыңыз."],
v1605:["6 · Дополните предложения о людях, которых вы можете знать.","6 · Өзіңіз білуі мүмкін адамдар туралы сөйлемдерді толықтырыңыз."],
v1606:["7 · Работайте в парах. Две минуты.","7 · Жұппен жұмыс істеңіз. Екі минут."],
v1607:["Студент A называет слово из этапа 2. У студента B десять секунд, чтобы назвать реального человека — известного или нет — и объяснить почему. Затем поменяйтесь. Отметьте выполненным, когда у каждого будет по четыре хода.","A студент 2-кезеңнен сөз айтады. B студентте нақты адамды — танымал не таныс — атап, себебін айтуға он секунд бар. Содан соң ауысыңыздар. Әрқайсың төрт реттен өткенде орындалды деп белгілеңіз."],
v1608:["Не останавливайтесь на ошибках. Запишите их и разберите вместе в конце.","Қателерге тоқтамаңыз. Жазып алып, соңында бірге талдаңыз."],
v1609:["7 · Две минуты с преподавателем.","7 · Мұғаліммен екі минут."],
v1610:["Преподаватель называет слово из этапа 2. У вас десять секунд, чтобы назвать реального человека и объяснить почему. Затем вы называете слово, а отвечает преподаватель.","Мұғалім 2-кезеңнен сөз айтады. Сізде нақты адамды атап, себебін айтуға он секунд бар. Содан кейін сіз сөз айтасыз, мұғалім жауап береді."],
v1611:["Преподавателю: фиксируйте ошибки, но не прерывайте дрилл.","Мұғалімге: қателерді жазып отырыңыз, бірақ жаттығуды үзбеңіз."],
v1612:["7 · Напишите по одному правдивому предложению для четырёх слов.","7 · Төрт сөзге бір-бір шын сөйлем жазыңыз."],
v1613:["Каждый раз берите реального человека.","Әр жолы нақты адам алыңыз."],
g1601:["Прочитайте эти четыре предложения из текста этапа 5.","5-кезеңдегі мәтіннен алынған осы төрт сөйлемді оқыңыз."],
g1602:["В каком предложении один объект сравнивается со всеми остальными?","Қай сөйлемде бір нәрсе қалғандарының барлығымен салыстырылады?"],
g1603:["Три формы","Үш форма"],
g1604:["Правила, которые важны","Маңызды ережелер"],
g1605:["Два объекта → сравнительная степень + than. Один выше всех → the + превосходная степень.","Екі нәрсе → салыстырмалы дәреже + than. Біреуі бәрінен жоғары → the + үстеме дәреже."],
g1606:["Короткие слова берут -er / -est. Длинные — more / the most. Только одно из двух, никогда оба: не more taller, не the most tallest.","Қысқа сөздер -er / -est алады. Ұзындары — more / the most. Тек біреуін, ешқашан екеуін бірге емес: more taller да, the most tallest те болмайды."],
g1607:["as … as требует обоих слов. as tall than me — самая частая ошибка на этом уровне.","as … as екі сөзді де қажет етеді. as tall than me — осы деңгейдегі ең жиі қате."],
g1608:["Чтобы показать величину разницы, поставьте впереди much или a bit: much cheaper, a bit more expensive.","Айырманың мөлшерін көрсету үшін алдына much не a bit қойыңыз: much cheaper, a bit more expensive."],
g1609:["Квантификаторы вы проходили в уроке 14. Они вернутся в задании 5 следующего этапа.","Квантификаторларды 14-сабақта өткенсіз. Олар келесі кезеңнің 5-тапсырмасында қайта оралады."],
g1610:["Послушайте. Какое предложение вы слышите?","Тыңдаңыз. Қай сөйлемді естисіз?"],
g1611:["В быстрой речи than и as почти исчезают. Слушайте вместо этого окончание прилагательного.","Жылдам сөйлегенде than мен as жойылып кетеді. Оның орнына сын есімнің жалғауын тыңдаңыз."],
p1601:["1 · Выберите правильную форму.","1 · Дұрыс форманы таңдаңыз."],
p1602:["2 · Перепишите предложение со словом в скобках. Смысл сохраните.","2 · Жақшадағы сөзбен сөйлемді қайта жазыңыз. Мағынасын сақтаңыз."],
p1603:["Наберите предложение целиком.","Сөйлемді толық теріңіз."],
p1604:["3 · В каждом предложении одно слово неверно. Нажмите на него.","3 · Әр сөйлемде бір сөз қате. Соны басыңыз."],
p1605:["4 · Дополните одним словом.","4 · Бір сөзбен толықтырыңыз."],
p1606:["В каждый пропуск идёт than, as, the, much или bit.","Әр бос орынға than, as, the, much не bit келеді."],
p1607:["5 · повтор Количество снова — урок 14. Выберите правильное слово.","5 · қайталау Мөлшер тағы да — 14-сабақ. Дұрыс сөзді таңдаңыз."],
p1608:["much и many в вопросах и отрицаниях; a few с исчисляемыми, a little с неисчисляемыми.","much пен many сұрақ пен болымсызда; a few саналатынмен, a little саналмайтынмен."],
p1609:["6 · Сделайте правдивым для себя. Дополните каждое предложение о реальном человеке.","6 · Өзіңізге шындық етіңіз. Әр сөйлемді нақты адам туралы толықтырыңыз."],
p1610:["Напишите три предложения: одно с -er than, одно с as … as, одно с the most.","Үш сөйлем жазыңыз: біреуі -er than, біреуі as … as, біреуі the most."],
r1601:["Перед чтением. Посмотрите на заголовок. Кто такие, по-вашему, «тихие»?","Оқымас бұрын. Тақырыпқа қараңыз. Сіздіңше, «үнсіздер» кімдер?"],
r1602:["1 · Прочитайте быстро. Подберите заголовок к каждому абзацу. Один заголовок лишний.","1 · Жылдам оқыңыз. Әр абзацқа тақырып таңдаңыз. Бір тақырып артық."],
r1603:["2 · Прочитайте снова. Верно или неверно?","2 · Қайта оқыңыз. Дұрыс па, бұрыс па?"],
r1604:["3 · Найдите в тексте слово, которое значит…","3 · Мәтіннен мына мағынадағы сөзді табыңыз…"],
r1605:["4 · Какие из них встречаются в тексте как превосходная степень? Выберите все.","4 · Мәтінде қайсысы үстеме дәрежеде кездеседі? Барлығын таңдаңыз."],
r1606:["5 · Послушайте. Мужчина рассказывает о человеке, с которым снимает квартиру.","5 · Тыңдаңыз. Ер адам пәтерлес адамы туралы айтады."],
r1607:["Прослушайте один раз ради общей картины, затем отвечайте.","Жалпы түсінік үшін бір рет тыңдаңыз, содан кейін жауап беріңіз."],
s1601:["Полезные фразы","Пайдалы сөз тіркестері"],
s1602:["1 · Работайте в парах. Возьмите карточку. Сделайте пять сравнений. Затем поменяйтесь карточками и повторите.","1 · Жұппен жұмыс істеңіз. Карта алыңыз. Бес салыстыру жасаңыз. Содан соң карталарды ауыстырып қайталаңыз."],
s1603:["Партнёр должен задать вам по одному вопросу о каждом человеке. Не просто читайте карточку.","Серіктесіңіз әр адам туралы бір-бір сұрақ қоюы керек. Картаны жай оқып шықпаңыз."],
s1604:["2 · Смените партнёра. Перескажите два сравнения первого партнёра.","2 · Серіктесті ауыстырыңыз. Бірінші серіктесіңіздің екі салыстыруын айтып беріңіз."],
s1605:["Преподавателю: после смены дайте обратную связь — одна удачная фраза, одна для следующего раза.","Мұғалімге: ауысқаннан кейін кері байланыс беріңіз — бір сәтті тіркес, бір келесі жолға."],
s1606:["1 · Возьмите карточку и сделайте пять сравнений для преподавателя. Затем возьмите вторую карточку и повторите.","1 · Карта алып, мұғалімге бес салыстыру жасаңыз. Содан соң екінші картаны алып қайталаңыз."],
s1607:["Преподаватель задаст вам по одному вопросу о каждом человеке и запишет ошибки на конец.","Мұғалім әр адам туралы бір сұрақ қойып, қателерді соңына жазып отырады."],
s1608:["2 · Преподаватель описывает двух людей. Задайте три вопроса, чтобы выяснить, кто терпеливее.","2 · Мұғалім екі адамды сипаттайды. Кім шыдамдырақ екенін білу үшін үш сұрақ қойыңыз."],
s1609:["Преподавателю: обратная связь после обоих кругов, не во время.","Мұғалімге: кері байланыс екі айналымнан кейін, барысында емес."],
s1610:["1 · Напишите короткий абзац, сравнивая двух хорошо знакомых вам людей.","1 · Өзіңізге жақсы таныс екі адамды салыстырып, қысқа абзац жазыңыз."],
s1611:["Около 60–80 слов. Используйте минимум одно -er than, одно as … as и одно the most.","Шамамен 60–80 сөз. Кемінде бір -er than, бір as … as және бір the most қолданыңыз."],
s1612:["3 · Обсудите.","3 · Талқылаңыз."],
s1613:["Напишите два-три предложения на каждый вопрос.","Әр сұраққа екі-үш сөйлем жазыңыз."],
z1604:["Следующий урок","Келесі сабақ"],
z1605:["A long way home — семья, воссоединившаяся спустя годы, и разница между I've lived here for ten years и I lived there in 2010.","A long way home — жылдардан кейін қайта қауышқан отбасы және I've lived here for ten years мен I lived there in 2010 арасындағы айырма."],
w1701:["Расставьте события в обычном порядке. Нажимайте от первого к последнему.","Оқиғаларды әдеттегі ретпен қойыңыз. Біріншіден соңғысына қарай басыңыз."],
w1702:["Нажмите на карточку ещё раз, чтобы убрать её из порядка.","Картаны реттен шығару үшін оны тағы бір рет басыңыз."],
w1703:["Сравните","Салыстырыңыз"],
w1704:["Работайте в парах. Что из этих шести с вами уже случилось? Что будет следующим?","Жұппен жұмыс істеңіз. Осы алтаудың қайсысы сізде болып қойды? Келесісі қайсы?"],
w1705:["Найдите одно событие, которое произошло у вас обоих в один и тот же год.","Екеуіңізде бір жылда болған бір оқиғаны табыңыз."],
w1706:["Расскажите преподавателю, что из шести с вами уже случилось и что будет следующим.","Мұғалімге алтаудың қайсысы болып қойғанын және келесісі қайсы екенін айтыңыз."],
w1707:["Запишите","Жазып қойыңыз"],
w1708:["Что из шести с вами уже случилось? Напишите списком. Полные предложения пока не нужны.","Алтаудың қайсысы сізде болып қойды? Тізіммен жазыңыз. Толық сөйлем әзірге қажет емес."],
t1701:["1 · Послушайте шесть вопросов. Напишите слово родства к каждому.","1 · Алты сұрақты тыңдаңыз. Әрқайсысына туыстық сөзді жазыңыз."],
t1702:["Проигрывайте вопрос столько раз, сколько нужно.","Сұрақты қажет болғанша қайта ойнатыңыз."],
t1703:["Теперь послушайте ответы и написание.","Енді жауаптар мен жазылуын тыңдаңыз."],
t1704:["2 · Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","2 · Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
t1705:["Показать перевод","Аудармасын көрсету"],
v1701:["4 · Соотнесите каждое слово с его значением.","4 · Әр сөзді мағынасымен сәйкестендіріңіз."],
v1702:["5 · Родство по крови или по браку? Распределите слова.","5 · Қандық туыс па, әлде неке арқылы ма? Сөздерді бөліңіз."],
v1703:["6 · Дополните предложения.","6 · Сөйлемдерді толықтырыңыз."],
g1701:["Прочитайте эти четыре предложения из записи этапа 5.","5-кезеңдегі жазбадан алынған осы төрт сөйлемді оқыңыз."],
g1702:["Два из этих предложений точно говорят, когда это было. Какое время они используют?","Осы сөйлемдердің екеуі оның қашан болғанын дәл айтады. Олар қай шақты қолданады?"],
g1703:["Выбор: сказано ли в предложении «когда»?","Таңдау: сөйлемде «қашан» деп айтылған ба?"],
g1704:["Правила, которые важны","Маңызды ережелер"],
g1705:["Форма: have / has + причастие прошедшего времени. been, done, seen, found, lived, moved. У неправильных глаголов есть третья форма — учите её вместе с двумя другими.","Формасы: have / has + өткен шақ есімшесі. been, done, seen, found, lived, moved. Дұрыс емес етістіктердің үшінші формасы бар — оны басқа екеуімен бірге жаттаңыз."],
g1706:["Если в предложении названо законченное время (yesterday, in 2010, when I was five), нужен Past Simple. Именно это правило решает почти каждое экзаменационное задание.","Егер сөйлемде аяқталған уақыт аталса (yesterday, in 2010, when I was five), Past Simple керек. Емтихан тапсырмаларының дерлік бәрін осы ереже шешеді."],
g1707:["Present Perfect — для опыта за всю жизнь: Have you ever eaten horse meat?","Present Perfect — өмір бойғы тәжірибе үшін: Have you ever eaten horse meat?"],
g1708:["Очень частая схема: первый вопрос в Present Perfect, ответ переходит в Past Simple. — Have you been to Astana? — Yes, I went there last summer.","Өте жиі үлгі: бірінші сұрақ Present Perfect, жауап Past Simple-ге ауысады. — Have you been to Astana? — Yes, I went there last summer."],
g1709:["for и since тоже работают с этим временем (I've lived here for ten years). Полноценно они вернутся в юните 12.","for мен since те осы шақпен жұмыс істейді (I've lived here for ten years). Толық түрде 12-юнитте қайта оралады."],
p1701:["1 · Выберите правильную форму.","1 · Дұрыс форманы таңдаңыз."],
p1702:["2 · Дополните правильной формой глагола в скобках.","2 · Жақшадағы етістіктің дұрыс формасымен толықтырыңыз."],
p1703:["3 · Какое время нужно предложению? Сначала прочитайте выражение времени.","3 · Сөйлемге қай шақ керек? Алдымен уақыт тіркесін оқыңыз."],
p1704:["Это задание решает всё: сказано ли в предложении «когда»?","Барлығын осы тапсырма шешеді: сөйлемде «қашан» деп айтылған ба?"],
p1705:["4 · В каждом предложении одно слово неверно. Нажмите на него.","4 · Әр сөйлемде бір сөз қате. Соны басыңыз."],
p1706:["5 · повтор Послушайте. Второе предложение верное?","5 · қайталау Тыңдаңыз. Екінші сөйлем дұрыс па?"],
p1707:["Восемь коротких пар из обзора юнита. Первое предложение описывает человека, второе называет его.","Юнит шолуынан алынған сегіз қысқа жұп. Бірінші сөйлем адамды сипаттайды, екіншісі оны атайды."],
l1701:["Перед прослушиванием. Книга называется A Long Way Home. О чём, по-вашему, история?","Тыңдамас бұрын. Кітаптың аты A Long Way Home. Сіздіңше, әңгіме не туралы?"],
l1702:["1 · Послушайте часть 1. Выберите правильный ответ.","1 · 1-бөлікті тыңдаңыз. Дұрыс жауапты таңдаңыз."],
l1703:["2 · Послушайте части 2 и 3. Верно или неверно?","2 · 2 және 3-бөліктерді тыңдаңыз. Дұрыс па, бұрыс па?"],
l1704:["3 · Послушайте часть 4. Расставьте события в том порядке, в каком слышите.","3 · 4-бөлікті тыңдаңыз. Оқиғаларды естіген ретіңізбен қойыңыз."],
l1705:["4 · Дополните два предложения из записи. Одно — Present Perfect, другое — Past Simple.","4 · Жазбадан алынған екі сөйлемді толықтырыңыз. Біреуі — Present Perfect, екіншісі — Past Simple."],
l1706:["5 · Обсудите.","5 · Талқылаңыз."],
l1707:["Напишите два-три предложения на каждый вопрос.","Әр сұраққа екі-үш сөйлем жазыңыз."],
s1701:["Полезные фразы","Пайдалы сөз тіркестері"],
s1702:["1 · Работайте в парах. Спросите партнёра по каждой строке. Если ответ «да», задайте один уточняющий вопрос в Past Simple.","1 · Жұппен жұмыс істеңіз. Әр жол бойынша серіктесіңізден сұраңыз. Жауап «иә» болса, Past Simple-де бір нақтылаушы сұрақ қойыңыз."],
s1703:["В уточняющем вопросе должно быть время: When did you…? How long did you…?","Нақтылаушы сұрақта уақыт болуы керек: When did you…? How long did you…?"],
s1704:["2 · Смените партнёра. Расскажите о двух вещах, которые сделал первый партнёр.","2 · Серіктесті ауыстырыңыз. Бірінші серіктесіңіз істеген екі нәрсе туралы айтыңыз."],
s1705:["Преподавателю: обратная связь после второго круга — одна удачная фраза, одна для следующего раза. Слушайте have been против went.","Мұғалімге: кері байланыс екінші айналымнан кейін — бір сәтті тіркес, бір келесі жолға. have been мен went-ті тыңдаңыз."],
s1706:["1 · Спросите преподавателя по каждой строке. Если ответ «да», задайте один уточняющий вопрос в Past Simple. Затем преподаватель спрашивает вас.","1 · Әр жол бойынша мұғалімнен сұраңыз. Жауап «иә» болса, Past Simple-де бір нақтылаушы сұрақ қойыңыз. Содан соң мұғалім сізден сұрайды."],
s1707:["Преподавателю: отвечайте коротко и ждите уточняющего вопроса. Не подсказывайте его.","Мұғалімге: қысқа жауап беріп, нақтылаушы сұрақты күтіңіз. Оны айтып жібермеңіз."],
s1708:["2 · Расскажите преподавателю историю одного опыта из списка в Past Simple.","2 · Мұғалімге тізімдегі бір тәжірибенің тарихын Past Simple-де айтып беріңіз."],
s1709:["Преподавателю: обратная связь в конце, не во время рассказа.","Мұғалімге: кері байланыс соңында, әңгіме барысында емес."],
s1710:["1 · Ответьте на каждый вопрос двумя предложениями: одно в Present Perfect, одно в Past Simple.","1 · Әр сұраққа екі сөйлеммен жауап беріңіз: біреуі Present Perfect, біреуі Past Simple."],
s1711:["Пример: Yes, I've lived in another city. I lived in Almaty for two years when I was a student.","Мысал: Yes, I've lived in another city. I lived in Almaty for two years when I was a student."],
s1712:["2 · Напишите короткий абзац о самом интересном событии в истории вашей семьи.","2 · Отбасыңыз тарихындағы ең қызық оқиға туралы қысқа абзац жазыңыз."],
s1713:["Около 70–90 слов. Начните в Present Perfect, затем расскажите историю в Past Simple.","Шамамен 70–90 сөз. Present Perfect-пен бастап, әңгімені Past Simple-де айтыңыз."],
z1704:["Следующий урок","Келесі сабақ"],
z1705:["Have you heard? — как сообщать хорошие и плохие новости, как на них реагировать, и три коротких слова just, already и yet.","Have you heard? — жақсы және жаман жаңалықты қалай айту, оларға қалай жауап беру, және just, already, yet деген үш қысқа сөз."],
w1801:["Вам присылают такое сообщение. Это хорошая новость, плохая или как посмотреть?","Сізге осындай хабарлама келді. Бұл жақсы жаңалық па, жаман ба, әлде қалай қарағанға байланысты ма?"],
w1802:["Здесь нет правильного ответа. Выберите то, что думаете на самом деле.","Мұнда дұрыс жауап жоқ. Шын ойлағаныңызды таңдаңыз."],
w1803:["Сравните","Салыстырыңыз"],
w1804:["Работайте в парах. Найдите одно сообщение, которое вы отнесли по-разному. Скажите почему.","Жұппен жұмыс істеңіз. Әртүрлі санатқа қосқан бір хабарламаны табыңыз. Себебін айтыңыз."],
w1805:["На какое из шести вы ответили бы первым? На какое отвечать труднее всего?","Алтаудың қайсысына бірінші жауап берер едіңіз? Қайсысына жауап беру ең қиын?"],
w1806:["Сравните с преподавателем. Найдите одно сообщение, которое вы отнесли по-разному, и скажите почему.","Мұғаліммен салыстырыңыз. Әртүрлі санатқа қосқан бір хабарламаны тауып, себебін айтыңыз."],
w1807:["Запишите","Жазып қойыңыз"],
w1808:["Выберите сообщение, которое отметили как «как посмотреть». Напишите одно предложение, от чего это зависит.","«Қалай қарағанға байланысты» деп белгілеген хабарламаны таңдаңыз. Неге байланысты екенін бір сөйлеммен жазыңыз."],
t1801:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
t1802:["Показать перевод","Аудармасын көрсету"],
v1801:["3 · Какая приставка образует противоположность? Выберите un-, im- или dis-.","3 · Қай префикс қарама-қарсы мағына береді? un-, im- не dis- таңдаңыз."],
v1802:["im- бывает только перед p и m. dis- встречается редко — таких слов немного.","im- тек p мен m алдында келеді. dis- сирек — ондай сөздер аз."],
v1803:["4 · Соотнесите каждое слово с его значением.","4 · Әр сөзді мағынасымен сәйкестендіріңіз."],
v1804:["5 · Послушайте. Второй говорящий соглашается и использует слово-противоположность. Какое слово вы слышите?","5 · Тыңдаңыз. Екінші сөйлеуші келісіп, қарама-қарсы сөзді қолданады. Қай сөзді естисіз?"],
v1805:["6 · Дополните каждое предложение одним словом из этапа 2.","6 · Әр сөйлемді 2-кезеңдегі бір сөзбен толықтырыңыз."],
g1801:["Прочитайте эти четыре строки из сообщений этапа 5.","5-кезеңдегі хабарламалардан алынған осы төрт жолды оқыңыз."],
g1802:["Где стоит yet и в каком типе предложения?","yet қай жерде тұрады және қандай сөйлем түрінде?"],
g1803:["Одно время, три слова","Бір шақ, үш сөз"],
g1804:["Правила, которые важны","Маңызды ережелер"],
g1805:["just и already стоят между have и причастием. yet стоит в конце предложения.","just пен already have мен есімшенің арасында тұрады. yet сөйлемнің соңында тұрады."],
g1806:["yet работает только в вопросах и отрицаниях. В утвердительном предложении используйте already.","yet тек сұрақ пен болымсызда жұмыс істейді. Болымды сөйлемде already қолданыңыз."],
g1807:["already в вопросе показывает удивление: Have you finished already? значит «как быстро».","Сұрақтағы already таңданысты білдіреді: Have you finished already? «қандай жылдам» дегені."],
g1808:["Не ставьте с этими словами законченное время. I've just arrived yesterday — ошибка: yesterday требует Past Simple.","Бұл сөздермен аяқталған уақытты қоспаңыз. I've just arrived yesterday — қате: yesterday Past Simple талап етеді."],
g1809:["Послушайте. Одни и те же слова, сказанные дважды. В каком варианте звучит настоящий восторг?","Тыңдаңыз. Бірдей сөздер екі рет айтылған. Қай нұсқада шынайы қуаныш естіледі?"],
g1810:["В английском чувство передаётся голосом, а не словами. Плоское That's fantastic звучит как противоположность.","Ағылшынша сезім сөзбен емес, дауыспен беріледі. Жалпақ айтылған That's fantastic керісінше естіледі."],
p1801:["1 · Выберите правильное слово.","1 · Дұрыс сөзді таңдаңыз."],
p1802:["2 · Куда идёт слово из рамки? Нажмите на нужное место.","2 · Жақтаудағы сөз қайда келеді? Керекті орынды басыңыз."],
p1803:["3 · Перепишите предложение со словом в скобках.","3 · Жақшадағы сөзбен сөйлемді қайта жазыңыз."],
p1804:["4 · В каждом предложении одно слово неверно. Нажмите на него.","4 · Әр сөйлемде бір сөз қате. Соны басыңыз."],
p1805:["5 · повтор Present Perfect или Past Simple? Выберите правильную форму.","5 · қайталау Present Perfect па, Past Simple па? Дұрыс форманы таңдаңыз."],
n1801:["1 · Послушайте пять разговоров. Новость хорошая или плохая?","1 · Бес әңгімені тыңдаңыз. Жаңалық жақсы ма, жаман ба?"],
n1802:["2 · Послушайте разговоры 1 и 2 ещё раз. Выберите правильный ответ.","2 · 1 және 2-әңгімені тағы тыңдаңыз. Дұрыс жауапты таңдаңыз."],
n1803:["3 · Послушайте фразы. Для чего каждая из них?","3 · Тіркестерді тыңдаңыз. Әрқайсысы не үшін?"],
n1804:["Полезные фразы","Пайдалы сөз тіркестері"],
n1805:["4 · Прочитайте образец. Именно это вы напишете на следующем этапе.","4 · Үлгіні оқыңыз. Дәл осыны келесі кезеңде жазасыз."],
n1806:["5 · Посмотрите на образец. Что делает каждое сообщение? Расставьте четыре шага по порядку.","5 · Үлгіге қараңыз. Әр хабарлама не істейді? Төрт қадамды ретімен қойыңыз."],
n1807:["6 · Найдите в образце фразу, которая…","6 · Үлгіден мына тіркесті табыңыз…"],
n1808:["7 · Регистр. Вы написали бы это в сообщении другу или в письме руководителю?","7 · Стиль. Мұны досыңызға хабарламада жазар ма едіңіз, әлде басшыңызға хатта ма?"],
s1801:["1 · Напишите свой диалог. Используйте форму образца: новость → реакция → вопрос с yet → ответ с already или just.","1 · Өз диалогыңызды жазыңыз. Үлгінің формасын қолданыңыз: жаңалық → жауап → yet-пен сұрақ → already не just-пен жауап."],
s1802:["Два диалога: один с хорошей новостью, один с плохой. Около 40–60 слов каждый.","Екі диалог: біреуі жақсы жаңалықпен, біреуі жаманымен. Әрқайсысы шамамен 40–60 сөз."],
s1803:["Банк фраз","Тіркестер банкі"],
s1804:["Преподаватель прочитает это после устного задания, не сейчас.","Мұғалім мұны ауызша тапсырмадан кейін оқиды, қазір емес."],
s1805:["Сохраните и прочитайте оба диалога вслух.","Сақтап қойыңыз да, екі диалогты дауыстап оқыңыз."],
s1806:["2 · Проверьте себя.","2 · Өзіңізді тексеріңіз."],
s1807:["3 · Работайте в парах. Возьмите карточку и сообщите новость. Партнёр реагирует и задаёт вопрос с yet. Затем поменяйтесь карточками.","3 · Жұппен жұмыс істеңіз. Карта алып, жаңалықты айтыңыз. Серіктесіңіз жауап беріп, yet-пен сұрақ қояды. Содан соң карталарды ауыстырыңыз."],
s1808:["Не читайте карточку вслух. Сообщите новость одним предложением и дайте партнёру спросить.","Картаны дауыстап оқымаңыз. Жаңалықты бір сөйлеммен айтып, серіктесіңізге сұрауға мүмкіндік беріңіз."],
s1809:["4 · Смените партнёра и сообщите новость со второй карточки. Теперь реагируйте голосом, а не только словами.","4 · Серіктесті ауыстырып, екінші картадағы жаңалықты айтыңыз. Енді сөзбен ғана емес, дауыспен де жауап беріңіз."],
s1810:["Преподавателю: после смены дайте обратную связь — одна удачная фраза, одна для следующего раза. Слушайте yet в уточняющем вопросе.","Мұғалімге: ауысқаннан кейін кері байланыс беріңіз — бір сәтті тіркес, бір келесі жолға. Нақтылаушы сұрақтағы yet-ті тыңдаңыз."],
s1811:["3 · Возьмите карточку и сообщите новость преподавателю. Он реагирует и задаёт вопрос с yet. Затем возьмите вторую карточку.","3 · Карта алып, мұғалімге жаңалықты айтыңыз. Ол жауап беріп, yet-пен сұрақ қояды. Содан соң екінші картаны алыңыз."],
s1812:["Преподавателю: сначала отреагируйте, потом спросите. Не подсказывайте фразу студенту.","Мұғалімге: алдымен жауап беріп, содан кейін сұраңыз. Студентке тіркесті айтып жібермеңіз."],
s1813:["4 · Преподаватель сообщает вам новость. Отреагируйте и задайте два вопроса.","4 · Мұғалім сізге жаңалық айтады. Жауап беріп, екі сұрақ қойыңыз."],
s1814:["Преподавателю: обратная связь после обоих кругов, не во время.","Мұғалімге: кері байланыс екі айналымнан кейін, барысында емес."],
s1815:["3 · Прочитайте новость. Напишите свою реакцию и один уточняющий вопрос с yet.","3 · Жаңалықты оқыңыз. Өз жауабыңызды және yet-пен бір нақтылаушы сұрақ жазыңыз."],
z1801:["Юнит 6 закончен","6-юнит аяқталды"],
z1802:["Следующим пройдите Обзорный тест юнита 6: сравнительная и превосходная степень, Present Perfect против Past Simple, just / already / yet и словарь юнита. Тридцать вопросов. Проходить можно сколько угодно раз.","Келесі кезекте 6-юниттің шолу тестін өтіңіз: салыстырмалы және үстеме дәреже, Present Perfect пен Past Simple, just / already / yet және юнит сөздігі. Отыз сұрақ. Қалағаныңызша қайталауға болады."],
/* ---- Unit 4 ---- */
u4a101:["В каком возрасте у вас обычно делают эти вещи? Выберите возраст для каждой.","Сіздің елде мұны әдетте қай жаста істейді? Әрқайсысына жас таңдаңыз."],
u4a102:["Правильного ответа нет — это про вашу страну, а не тест.","Дұрыс жауап жоқ — бұл сіздің ел туралы, тест емес."],
u4a103:["Сохраните ответы. Вы сравните их с тремя людьми из текста.","Жауаптарыңызды сақтаңыз. Оларды мәтіндегі үш адаммен салыстырасыз."],
u4a104:["Запишите","Жазып қойыңыз"],
u4a105:["Напишите два предложения: одно, что вы начали делать за последние пять лет, и одно, что перестали.","Екі сөйлем жазыңыз: соңғы бес жылда бастаған бір ісіңіз және тоқтатқан бір ісіңіз."],
u4a106:["Узнайте","Біліп алыңыз"],
u4a107:["Спросите трёх человек, что они начали делать за последние пять лет. Найдите самый неожиданный ответ.","Үш адамнан соңғы бес жылда не бастағанын сұраңыз. Ең күтпеген жауапты табыңыз."],
u4a108:["Расскажите одним предложением: <i>Aigerim took up boxing last year.</i>","Бір сөйлеммен айтып беріңіз: <i>Aigerim took up boxing last year.</i>"],
u4a109:["Спросите преподавателя, что он начал делать за последние пять лет и что перестал.","Мұғалімнен соңғы бес жылда нені бастап, нені тоқтатқанын сұраңыз."],
u4a110:["Скажите одно предложение в ответ: <i>You stopped doing that earlier than I did.</i>","Жауап ретінде бір сөйлем айтыңыз: <i>You stopped doing that earlier than I did.</i>"],
u4a201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
u4a202:["Показать перевод","Аудармасын көрсету"],
u4a203:["3 · Соедините каждое слово с его значением.","3 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u4a204:["4 · Расставьте эти события жизни в том порядке, в котором они обычно происходят.","4 · Осы өмір оқиғаларын әдетте болатын ретімен орналастырыңыз."],
u4a205:["Нажимайте на карточки по очереди. Нажмите ещё раз, чтобы вернуть карточку.","Карталарды кезекпен басыңыз. Қайтару үшін қайта басыңыз."],
u4a206:["5 · В каждой группе одно слово лишнее. Нажмите на него.","5 · Әр топта бір сөз артық. Соны басыңыз."],
u4a207:["6 · Какое слово завершает каждую фразу? Выберите из списка.","6 · Әр тіркесті қай сөз аяқтайды? Тізімнен таңдаңыз."],
u4a208:["7 · Дополните предложения. Не подглядывайте в карточки.","7 · Сөйлемдерді толықтырыңыз. Карталарға қарамаңыз."],
u4a301:["Прочитайте эти четыре предложения из текста, который вы будете читать.","Оқитын мәтіннен алынған осы төрт сөйлемді оқыңыз."],
u4a302:["Что определяет, будет ли второй глагол в форме <i>-ing</i> или с <i>to</i>?","Екінші етістіктің <i>-ing</i> әлде <i>to</i> түрінде болуын не анықтайды?"],
u4a303:["Какие глаголы что берут","Қай етістік нені алады"],
u4a304:["<b>ЧЕСТНОЕ ПРАВИЛО.</b> Правила нет. Решает первый глагол, и два списка нужно выучить. Покажите таблицу, отработайте частотные, идите дальше.","<b>ШЫНАЙЫ ЕРЕЖЕ.</b> Ереже жоқ. Бірінші етістік шешеді, екі тізімді жаттау керек. Кестені көрсетіңіз, жиілерін пысықтаңыз, әрі қарай жүріңіз."],
u4a305:["<b>ЧТО ДЕЙСТВИТЕЛЬНО РЕГУЛЯРНО.</b> После предлога всегда <i>-ing</i>: <i>instead of looking</i>, <i>good at playing</i>, <i>tired of waiting</i>.","<b>НАҚТЫ ЕРЕЖЕ.</b> Көмекші сөзден кейін әрқашан <i>-ing</i>: <i>instead of looking</i>, <i>good at playing</i>, <i>tired of waiting</i>."],
u4a306:["Ошибка, за которой стоит следить: время несёт только первый глагол. <i>He decided to teach</i>, никогда <i>He decided to taught</i>.","Байқау керек қате: шақты тек бірінші етістік көтереді. <i>He decided to teach</i>, ешқашан <i>He decided to taught</i> емес."],
u4a307:["<b>ЧЕСТНОЕ ПРАВИЛО.</b> Когда два глагола идут подряд, форму второго определяет <b>первый</b>. Правила, которое это предсказывает, нет — два списка из таблицы нужно выучить, по нескольку за раз.","<b>ШЫНАЙЫ ЕРЕЖЕ.</b> Екі етістік қатар келгенде, екіншісінің түрін <b>біріншісі</b> анықтайды. Мұны болжайтын ереже жоқ — кестедегі екі тізімді бірте-бірте жаттау керек."],
u4a308:["<b>ТРИ ГЛАГОЛА, КОТОРЫЕ МЕНЯЮТ СМЫСЛ.</b> <i>Stop smoking</i> — вы больше не курите; <i>stop to smoke</i> — вы остановились, чтобы покурить. <i>Remember locking the door</i> — у вас есть воспоминание; <i>remember to lock it</i> — это указание. <i>Try opening the window</i> — эксперимент; <i>try to open it</i> — это трудно.","<b>МАҒЫНАСЫН ӨЗГЕРТЕТІН ҮШ ЕТІСТІК.</b> <i>Stop smoking</i> — енді шекпейсіз; <i>stop to smoke</i> — шегу үшін тоқтадыңыз. <i>Remember locking the door</i> — есіңізде бар; <i>remember to lock it</i> — нұсқау. <i>Try opening the window</i> — тәжірибе; <i>try to open it</i> — қиын."],
u4a309:["<b>ПОСЛЕ ПРЕДЛОГА ВСЕГДА -ING.</b> <i>Instead of looking</i>, <i>interested in teaching</i>, <i>good at playing</i>, <i>tired of waiting</i>. Это единственная полностью регулярная часть — пользуйтесь ею.","<b>КӨМЕКШІ СӨЗДЕН КЕЙІН ӘРҚАШАН -ING.</b> <i>Instead of looking</i>, <i>interested in teaching</i>, <i>good at playing</i>, <i>tired of waiting</i>. Бұл — толық тұрақты жалғыз бөлік, пайдаланыңыз."],
u4a310:["Две ошибки: <i>He decided to taught</i> (время берёт только первый глагол) и <i>I enjoy to swim</i> (<i>enjoy</i> в списке <i>-ing</i>).","Екі қате: <i>He decided to taught</i> (шақты тек бірінші етістік алады) және <i>I enjoy to swim</i> (<i>enjoy</i> — <i>-ing</i> тізімінде)."],
u4a311:["Эти модели понадобятся снова в уроке 11, где <i>plan to</i>, <i>hope to</i> и <i>look forward to</i> описывают будущее.","Бұл үлгілер 11-сабақта қайта керек болады: <i>plan to</i>, <i>hope to</i> және <i>look forward to</i> болашақты сипаттайды."],
u4a312:["Распределите эти десять глаголов по двум спискам.","Осы он етістікті екі тізімге бөліңіз."],
u4a313:["Пять предложений из текста. Прочитайте каждое и определите, какая это модель.","Мәтіннен бес сөйлем. Әрқайсысын оқып, қай үлгі екенін анықтаңыз."],
u4a401:["1 · Выберите правильную форму.","1 · Дұрыс форманы таңдаңыз."],
u4a402:["2 · Поставьте глагол в скобках в нужную форму.","2 · Жақшадағы етістікті керекті түрге қойыңыз."],
u4a403:["3 · Обе формы существуют, но значат разное. Выберите ту, которую требует ситуация.","3 · Екі форма да бар, бірақ мағыналары бөлек. Жағдайға сай келетінін таңдаңыз."],
u4a404:["4 · Составьте предложение из слов.","4 · Сөздерден сөйлем құрастырыңыз."],
u4a405:["5 · В каждом предложении одно лишнее слово. Нажмите на него.","5 · Әр сөйлемде бір артық сөз бар. Соны басыңыз."],
u4a406:["6 · <span class=\"pill-rec\">повторение</span> Поставьте первый глагол в Past Simple. Второй оставьте как есть.","6 · <span class=\"pill-rec\">қайталау</span> Бірінші етістікті Past Simple-ге қойыңыз. Екіншісін сол күйінде қалдырыңыз."],
u4a407:["Дополнительная отработка","Қосымша жаттығу"],
u4a408:["Допишите вторую половину каждого предложения с глаголом в скобках. Выберите форму, которую требует первый глагол.","Әр сөйлемнің екінші бөлігін жақшадағы етістікпен жазыңыз. Бірінші етістік талап ететін форманы таңдаңыз."],
u4a409:["7 · Выберите форму, которая соответствует значению в скобках.","7 · Жақшадағы мағынаға сай форманы таңдаңыз."],
u4a501:["Перед чтением: в каком возрасте уже поздно полностью менять профессию?","Оқу алдында: мамандықты толық ауыстыруға қай жаста кеш?"],
u4a502:["Выберите один вариант. Затем прочитайте и проверьте, согласен ли текст с вами.","Бір нұсқаны таңдаңыз. Содан кейін оқып, мәтін сізбен келісе ме, тексеріңіз."],
u4a503:["Правильного ответа пока нет. Это ваше мнение.","Әзірге дұрыс жауап жоқ. Бұл — сіздің пікіріңіз."],
u4a504:["1 · Прочитайте текст один раз. О ком каждое предложение?","1 · Мәтінді бір рет оқыңыз. Әр сөйлем кім туралы?"],
u4a505:["2 · Прочитайте ещё раз. Ответьте, используя информацию из текста.","2 · Тағы бір оқыңыз. Мәтіндегі ақпаратты пайдаланып жауап беріңіз."],
u4a506:["3 · Верно или неверно?","3 · Дұрыс па, бұрыс па?"],
u4a507:["4 · Найдите в тексте слово, которое означает…","4 · Мәтіннен мына мағынадағы сөзді табыңыз…"],
u4a508:["5 · Посмотрите на эти фразы из текста. Какую модель берёт каждый первый глагол?","5 · Мәтіндегі осы тіркестерге қараңыз. Әр бірінші етістік қандай үлгі алады?"],
u4a601:["Полезные фразы","Пайдалы сөз тіркестері"],
u4a602:["1 · Работа в парах. Обсудите эти пять пунктов. В каждом ответе используйте глагольную модель.","1 · Жұппен жұмыс. Осы бес тармақты талқылаңыз. Әр жауапта етістік үлгісін қолданыңыз."],
u4a603:["2 · Работа в парах. Расставьте трёх людей из текста от самого смелого к наименее смелому и договоритесь о порядке.","2 · Жұппен жұмыс. Мәтіндегі үш адамды ең батылынан ең батыл емесіне қарай орналастырып, келісіңіз."],
u4a604:["Нужно договориться. Объясните почему: <i>She risked more because she decided to move as well.</i>","Келісу керек. Себебін айтыңыз: <i>She risked more because she decided to move as well.</i>"],
u4a605:["Преподавателю","Мұғалімге"],
u4a606:["Обратная связь после задания: одна хорошо использованная модель и одна, которую стоит переделать. Слушайте, не появляется ли <i>enjoy to</i> и время на втором глаголе. Не исправляйте во время задания.","Тапсырмадан кейінгі кері байланыс: жақсы қолданылған бір үлгі және қайта жасайтын біреуі. <i>Enjoy to</i> мен екінші етістіктегі шақты байқаңыз. Тапсырма кезінде түзетпеңіз."],
u4a607:["1 · Работа с преподавателем. Обсудите эти пять пунктов. В каждом ответе используйте глагольную модель.","1 · Мұғаліммен жұмыс. Осы бес тармақты талқылаңыз. Әр жауапта етістік үлгісін қолданыңыз."],
u4a608:["2 · Расставьте трёх людей из текста от самого смелого к наименее смелому. Преподаватель сделает то же самое. Договоритесь об одном порядке.","2 · Мәтіндегі үш адамды ең батылынан бастап орналастырыңыз. Мұғалім де солай жасайды. Бір ретке келісіңіз."],
u4a609:["Проверяйте после, а не во время: одна хорошо использованная модель и одна, которую стоит переделать.","Тапсырма кезінде емес, кейін тексеріңіз: жақсы қолданылған бір үлгі және қайта жасайтын біреуі."],
u4a610:["1 · Ответьте на эти пять пунктов письменно. В каждом ответе используйте глагольную модель.","1 · Осы бес тармаққа жазбаша жауап беріңіз. Әр жауапта етістік үлгісін қолданыңыз."],
u4a611:["1 то, чем вы начали заниматься и бросили · 2 то, чему всегда хотели научиться · 3 то, что постоянно начинаете и не заканчиваете · 4 профессия, о которой вы когда-то думали · 5 то, от чего вы никогда бы не отказались","1 бастап, тастап кеткен ісіңіз · 2 әрқашан үйренгіңіз келген нәрсе · 3 үнемі бастап, аяқтамайтын ісіңіз · 4 бір кездері ойлаған мамандық · 5 ешқашан тастамайтын ісіңіз"],
u4a612:["2 · Теперь напишите короткий абзац об одном изменении, которое вы бы сделали, если бы деньги не имели значения.","2 · Енді ақша маңызды болмаса жасайтын бір өзгеріс туралы қысқа абзац жазыңыз."],
u4a613:["Шестьдесят–восемьдесят слов. Используйте минимум три глагола из каждого списка.","Алпыс-сексен сөз. Әр тізімнен кемінде үш етістік қолданыңыз."],
u4a701:["Отметьте всё, что вы уже умеете.","Меңгергеніңіздің бәрін белгілеңіз."],
u4a702:["Преподавателю","Мұғалімге"],
u4a703:["Завершите уроком-чеклистом. Скажите вслух, что сегодня вернулся Past Simple — в упражнении 6 и по всему тексту. Укажите вперёд: эти модели вернутся в уроке 11 внутри <i>plan to</i> и <i>look forward to</i>.","Сабақты чек-парақпен аяқтаңыз. Бүгін Past Simple оралғанын дауыстап айтыңыз — 6-жаттығуда және мәтін бойында. Алға нұсқаңыз: бұл үлгілер 11-сабақта <i>plan to</i> мен <i>look forward to</i> ішінде оралады."],
u4b101:["Что вы первым делом делаете с телефоном утром? Выберите одно.","Таңертең телефонмен ең алдымен не істейсіз? Біреуін таңдаңыз."],
u4b102:["Затем выберите то, от чего вам было бы труднее всего отказаться на день.","Содан кейін бір күнге бас тартуға ең қиын болатынын таңдаңыз."],
u4b103:["Сохраните оба ответа. Вы сравните их с женщиной из записи.","Екі жауапты да сақтаңыз. Оларды жазбадағы әйелмен салыстырасыз."],
u4b104:["Запишите","Жазып қойыңыз"],
u4b105:["Напишите два предложения про завтра: одно уже с кем-то договорено, другое вы намерены сделать, но не договаривались.","Ертең туралы екі сөйлем жазыңыз: бірі біреумен келісілген, екіншісі — ниет, бірақ келісілмеген."],
u4b106:["Узнайте","Біліп алыңыз"],
u4b107:["Спросите трёх человек, что они делают первым делом утром. Найдите того, кто не берёт телефон.","Үш адамнан таңертең алдымен не істейтінін сұраңыз. Телефон алмайтын адамды табыңыз."],
u4b108:["Расскажите один ответ: <i>Marat reads the news before he gets up.</i>","Бір жауапты айтып беріңіз: <i>Marat reads the news before he gets up.</i>"],
u4b109:["Задайте преподавателю те же два вопроса. Его ответ близок к вашему?","Мұғалімге сол екі сұрақты қойыңыз. Жауабы сізге жақын ба?"],
u4b110:["Скажите одно предложение в ответ: <i>You would find it easier than me.</i>","Жауап ретінде бір сөйлем айтыңыз: <i>You would find it easier than me.</i>"],
u4b201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
u4b202:["Показать перевод","Аудармасын көрсету"],
u4b203:["3 · Соедините каждое слово с его значением.","3 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u4b204:["4 · На экране или вне экрана? Определите каждое действие в свою группу.","4 · Экранда ма әлде экраннан тыс па? Әр әрекетті өз тобына орналастырыңыз."],
u4b205:["5 · В каждой группе одно слово лишнее. Нажмите на него.","5 · Әр топта бір сөз артық. Соны басыңыз."],
u4b206:["6 · Какое слово завершает каждую фразу?","6 · Әр тіркесті қай сөз аяқтайды?"],
u4b207:["7 · Дополните предложения. Одно слово или фраза в каждый пропуск.","7 · Сөйлемдерді толықтырыңыз. Әр бос орынға бір сөз немесе тіркес."],
u4b301:["Прочитайте эти четыре предложения из записи.","Жазбадан алынған осы төрт сөйлемді оқыңыз."],
u4b302:["Два из четырёх уже договорены с другим человеком, на конкретное время. Какую форму они используют?","Төртеудің екеуі басқа адаммен нақты уақытқа келісілген. Олар қандай форманы қолданады?"],
u4b303:["В голове или в ежедневнике?","Ойда ма әлде күнделікте ме?"],
u4b304:["<b>ВОПРОС, КОТОРЫЙ ВСЁ РЕШАЕТ.</b> Это только у вас в голове или уже записано с кем-то? В голове → <i>going to</i>. Записано → Present Continuous.","<b>БАРЛЫҒЫН ШЕШЕТІН СҰРАҚ.</b> Бұл тек ойыңызда ма әлде біреумен жазылған ба? Ойда → <i>going to</i>. Жазылған → Present Continuous."],
u4b305:["<b>ЧАСТО ПОДХОДЯТ ОБЕ.</b> <i>I&rsquo;m going to see my sister later</i> и <i>I&rsquo;m seeing my sister later</i> — оба верны. Второй звучит более определённо.","<b>ЕКЕУІ ДЕ ЖИІ ДҰРЫС.</b> <i>I&rsquo;m going to see my sister later</i> және <i>I&rsquo;m seeing my sister later</i> — екеуі де дұрыс. Екіншісі нақтырақ естіледі."],
u4b306:["Ошибка, за которой стоит следить: Present Simple здесь не форма будущего. <i>I meet a friend tomorrow</i> — неверно; нужно <i>I&rsquo;m meeting a friend tomorrow</i>.","Байқау керек қате: мұнда Present Simple болашақ формасы емес. <i>I meet a friend tomorrow</i> — қате; <i>I&rsquo;m meeting a friend tomorrow</i> деу керек."],
u4b307:["<b>GOING TO = НАМЕРЕНИЕ.</b> Вы решили, но ни с кем ничего не зафиксировано: <i>I&rsquo;m going to look through some magazines this afternoon.</i> Форма: <i>am / is / are</i> + <i>going to</i> + глагол в начальной форме.","<b>GOING TO = НИЕТ.</b> Шештіңіз, бірақ ешкіммен бекітілмеген: <i>I&rsquo;m going to look through some magazines this afternoon.</i> Формасы: <i>am / is / are</i> + <i>going to</i> + бастапқы етістік."],
u4b308:["<b>PRESENT CONTINUOUS = ДОГОВОРЁННОСТЬ.</b> Время, место и обычно другой человек уже зафиксированы: <i>I&rsquo;m meeting a friend for lunch at one o&rsquo;clock.</i> Форма: <i>am / is / are</i> + <i>-ing</i>, как в настоящем, но со словом о будущем времени.","<b>PRESENT CONTINUOUS = КЕЛІСІМ.</b> Уақыт, орын және әдетте басқа адам бекітілген: <i>I&rsquo;m meeting a friend for lunch at one o&rsquo;clock.</i> Формасы: <i>am / is / are</i> + <i>-ing</i>, болашақ уақыт сөзімен."],
u4b309:["<b>ЧАСТО РАБОТАЮТ ОБЕ.</b> <i>I&rsquo;m going to see my sister later</i> и <i>I&rsquo;m seeing my sister later</i> — оба правильный английский. Present Continuous звучит определённее, как будто это уже где-то записано.","<b>ЕКЕУІ ДЕ ЖИІ ЖҰМЫС ІСТЕЙДІ.</b> <i>I&rsquo;m going to see my sister later</i> және <i>I&rsquo;m seeing my sister later</i> — екеуі де дұрыс. Present Continuous нақтырақ, бір жерге жазылғандай естіледі."],
u4b310:["<b>GOING TO ПРИ ОЧЕВИДНОСТИ.</b> Есть второе употребление: то, что уже видно. <i>Look at those clouds — it&rsquo;s going to rain.</i> Никто ничего не решал; доказательство перед вами.","<b>КӨЗГЕ КӨРІНГЕНДЕ GOING TO.</b> Екінші қолданысы бар: алдын ала көрініп тұрған нәрсе. <i>Look at those clouds — it&rsquo;s going to rain.</i> Ешкім ештеңе шешкен жоқ; дәлел көз алдыңызда."],
u4b311:["Две ошибки: Present Simple не форма будущего (<i>I meet a friend tomorrow</i> неверно), и <i>going to go</i> корректно, но тяжеловесно — говорят <i>I&rsquo;m going to Paris</i>.","Екі қате: Present Simple болашақ формасы емес (<i>I meet a friend tomorrow</i> қате), және <i>going to go</i> дұрыс, бірақ ауыр — <i>I&rsquo;m going to Paris</i> дейді."],
u4b312:["В уроке 12 вы будете использовать обе формы, чтобы пригласить человека и сказать, когда вы свободны.","12-сабақта екі форманы да қолданып, адамды шақырасыз және қашан бос екеніңізді айтасыз."],
u4b313:["Слушайте и читайте. Пять предложений из записи, по одному.","Тыңдап оқыңыз. Жазбадан бес сөйлем, бір-бірден."],
u4b314:["Navigate B1 · Audio 4.9. В первых трёх есть форма будущего, в двух последних — нет. Услышьте разницу.","Navigate B1 · Audio 4.9. Алғашқы үшеуінде болашақ формасы бар, соңғы екеуінде жоқ. Айырмасын естіңіз."],
u4b315:["Послушайте пять предложений ещё раз. В быстрой речи <i>going to</i> часто звучит как одно короткое слово. В каких предложениях оно есть?","Бес сөйлемді тағы тыңдаңыз. Жылдам сөйлегенде <i>going to</i> жиі бір қысқа сөздей естіледі. Ол қай сөйлемдерде бар?"],
u4b316:["Только распознавание — вам не обязательно самим так произносить. Прослушайте каждое дважды, прежде чем выбирать.","Тек тану — өзіңіз солай айтуыңыз міндетті емес. Таңдау алдында әрқайсысын екі рет тыңдаңыз."],
u4b401:["1 · Намерение или договорённость? Выберите более естественную форму.","1 · Ниет пе әлде келісім бе? Табиғирақ форманы таңдаңыз."],
u4b402:["2 · Дополните записи в ежедневнике формой Present Continuous.","2 · Күнделік жазбаларын Present Continuous формасымен толықтырыңыз."],
u4b403:["3 · Перепишите предложение с <i>going to</i>.","3 · Сөйлемді <i>going to</i> арқылы қайта жазыңыз."],
u4b404:["4 · В каждом предложении одно лишнее слово. Нажмите на него.","4 · Әр сөйлемде бір артық сөз бар. Соны басыңыз."],
u4b405:["5 · Дополните диалог. Используйте форму, которую требует ситуация.","5 · Диалогты толықтырыңыз. Жағдайға сай форманы қолданыңыз."],
u4b406:["6 · <span class=\"pill-rec\">повторение</span> Поставьте второй глагол в форму, которую требует первый.","6 · <span class=\"pill-rec\">қайталау</span> Екінші етістікті бірінші етістік талап ететін түрге қойыңыз."],
u4b407:["Дополнительная отработка","Қосымша жаттығу"],
u4b408:["Прочитайте ситуацию и выберите подходящую форму.","Жағдайды оқып, сәйкес форманы таңдаңыз."],
u4b409:["8 · Выберите предложение, которое соответствует каждой подписи.","8 · Әр белгіге сай сөйлемді таңдаңыз."],
u4b501:["Перед прослушиванием: героиня работает в моде и каждый день публикует посты. Как, по-вашему, пройдёт её день?","Тыңдау алдында: кейіпкер сән саласында жұмыс істейді және күн сайын жазба жариялайды. Оның күні қалай өтеді деп ойлайсыз?"],
u4b502:["Выберите сколько угодно вариантов. Затем послушайте и проверьте.","Қалағаныңызша нұсқа таңдаңыз. Содан кейін тыңдап тексеріңіз."],
u4b503:["Правильного ответа пока нет. Это ваш прогноз.","Әзірге дұрыс жауап жоқ. Бұл — сіздің болжамыңыз."],
u4b504:["1 · Прослушайте всю запись один раз. Ответьте на два вопроса.","1 · Бүкіл жазбаны бір рет тыңдаңыз. Екі сұраққа жауап беріңіз."],
u4b505:["2 · Прослушайте часть 1 ещё раз. Что она делает обычно? Верно или неверно?","2 · 1-бөлікті тағы тыңдаңыз. Ол әдетте не істейді? Дұрыс па, бұрыс па?"],
u4b506:["3 · Прослушайте часть 2 ещё раз. Дополните её план на день.","3 · 2-бөлікті тағы тыңдаңыз. Оның күндізгі жоспарын толықтырыңыз."],
u4b507:["4 · Прослушайте часть 3 ещё раз. Что она собирается изменить? Выберите все верные варианты.","4 · 3-бөлікті тағы тыңдаңыз. Ол нені өзгертпек? Барлық дұрыс нұсқаны таңдаңыз."],
u4b508:["5 · Вторая запись: двое коллег говорят о тридцатидневном челлендже. Послушайте и ответьте.","5 · Екінші жазба: екі әріптес отыз күндік челлендж туралы сөйлеседі. Тыңдап жауап беріңіз."],
u4b509:["6 · Два вопроса для обсуждения.","6 · Талқылауға арналған екі сұрақ."],
u4b510:["Ответьте в парах, затем возьмите два ответа от класса. / Ответьте, затем задайте те же два вопроса преподавателю. / Ответьте на оба письменно, по два-три предложения на каждый.","Жұппен жауап беріңіз, содан кейін сыныптан екі жауап алыңыз. / Жауап беріп, сол екі сұрақты мұғалімге қойыңыз. / Екеуіне де жазбаша, әрқайсысына екі-үш сөйлемнен жауап беріңіз."],
u4b601:["Полезные фразы","Пайдалы сөз тіркестері"],
u4b602:["1 · Заполните свой ежедневник на семь дней вперёд. Напишите четыре реальные договорённости, остальное оставьте пустым.","1 · Алдағы жеті күнге күнделігіңізді толтырыңыз. Төрт нақты келісім жазыңыз, қалғанын бос қалдырыңыз."],
u4b603:["2 · Работа в парах. Найдите два часа на следующей неделе, когда вы оба свободны.","2 · Жұппен жұмыс. Келесі аптада екеуіңіз де бос болатын екі сағат табыңыз."],
u4b604:["Спрашивайте про ежедневник, а не про намерения: <i>Are you doing anything on Wednesday evening?</i>","Ниет туралы емес, күнделік туралы сұраңыз: <i>Are you doing anything on Wednesday evening?</i>"],
u4b605:["Когда найдёте время, повторите это как договорённость: <i>So we&rsquo;re meeting on Wednesday at six.</i>","Уақытты тапқанда, оны келісім ретінде қайталаңыз: <i>So we&rsquo;re meeting on Wednesday at six.</i>"],
u4b606:["3 · Работа в парах. Выберите по одному тридцатидневному челленджу и объясните, как вы собираетесь его выполнять.","3 · Жұппен жұмыс. Әрқайсысы бір отыз күндік челлендж таңдап, оны қалай орындайтынын түсіндіріңіз."],
u4b607:["Партнёр минимум дважды спрашивает <i>How are you going to do it?</i> Каждый раз давайте другой ответ.","Серіктесіңіз кемінде екі рет <i>How are you going to do it?</i> деп сұрайды. Әр жолы басқа жауап беріңіз."],
u4b608:["Преподавателю","Мұғалімге"],
u4b609:["Обратная связь после задания: одна хорошо использованная форма будущего и одна, которую стоит переделать. Слушайте, не используется ли Present Simple как будущее. Не исправляйте во время задания.","Тапсырмадан кейінгі кері байланыс: жақсы қолданылған бір болашақ формасы және қайта жасайтын біреуі. Present Simple болашақ ретінде қолданылып жатыр ма, байқаңыз. Тапсырма кезінде түзетпеңіз."],
u4b610:["1 · Заполните свой ежедневник на семь дней вперёд. Четыре реальные договорённости, остальное пусто.","1 · Алдағы жеті күнге күнделігіңізді толтырыңыз. Төрт нақты келісім, қалғаны бос."],
u4b611:["2 · Работа с преподавателем. Найдите два часа на следующей неделе, когда вы оба свободны.","2 · Мұғаліммен жұмыс. Келесі аптада екеуіңіз де бос болатын екі сағат табыңыз."],
u4b612:["3 · Выберите один тридцатидневный челлендж и объясните преподавателю, как вы собираетесь его выполнять.","3 · Бір отыз күндік челлендж таңдап, оны қалай орындайтыныңызды мұғалімге түсіндіріңіз."],
u4b613:["Проверяйте после, а не во время: одна хорошо использованная форма будущего и одна, которую стоит переделать.","Тапсырма кезінде емес, кейін тексеріңіз: жақсы қолданылған бір болашақ формасы және қайта жасайтын біреуі."],
u4b614:["1 · Напишите свой настоящий ежедневник на семь дней — четыре договорённости, полными предложениями.","1 · Жеті күнге нақты күнделігіңізді жазыңыз — төрт келісім, толық сөйлеммен."],
u4b615:["Используйте Present Continuous, потому что это договорённости. Укажите день и время.","Present Continuous қолданыңыз, себебі бұл — келісімдер. Күні мен уақытын жазыңыз."],
u4b616:["2 · Теперь напишите о своём тридцатидневном челлендже: что это и как вы собираетесь его выполнять.","2 · Енді өз отыз күндік челленджіңіз туралы жазыңыз: ол не және оны қалай орындайсыз."],
u4b617:["Шестьдесят–восемьдесят слов. Используйте <i>going to</i> минимум четыре раза, включая один раз в отрицании.","Алпыс-сексен сөз. <i>Going to</i> кемінде төрт рет, оның бірі болымсызда."],
u4b701:["Отметьте всё, что вы уже умеете.","Меңгергеніңіздің бәрін белгілеңіз."],
u4b702:["Преподавателю","Мұғалімге"],
u4b703:["Завершите уроком-чеклистом. Скажите вслух, что сегодня вернулись глагольные модели — в упражнении 6 и внутри <i>plan to</i>, <i>give up</i> и <i>look forward to</i>. Укажите вперёд: урок 12 превращает эти планы в настоящее приглашение.","Сабақты чек-парақпен аяқтаңыз. Бүгін етістік үлгілері оралғанын дауыстап айтыңыз — 6-жаттығуда және <i>plan to</i>, <i>give up</i>, <i>look forward to</i> ішінде. Алға нұсқаңыз: 12-сабақ бұл жоспарларды нақты шақыруға айналдырады."],
u4c101:["Расставьте эти пять шагов в том порядке, в котором они обычно происходят.","Осы бес қадамды әдетте болатын ретімен орналастырыңыз."],
u4c102:["Нажимайте на карточки по очереди. Нажмите ещё раз, чтобы вернуть карточку.","Карталарды кезекпен басыңыз. Қайтару үшін қайта басыңыз."],
u4c103:["Запишите","Жазып қойыңыз"],
u4c104:["Вспомните того, с кем вы месяцами собираетесь увидеться. Напишите два предложения: кто это и почему встреча так и не состоялась.","Айлар бойы кездесуді ойлап жүрген адамды еске түсіріңіз. Екі сөйлем жазыңыз: ол кім және неге кездесу болмады."],
u4c105:["Узнайте","Біліп алыңыз"],
u4c106:["Спросите двух человек, с кем они месяцами собираются увидеться и почему это не происходит.","Екі адамнан айлар бойы кіммен кездесуді ойлап жүргенін және неге болмағанын сұраңыз."],
u4c107:["Расскажите один ответ одним предложением.","Бір жауапты бір сөйлеммен айтып беріңіз."],
u4c108:["Спросите преподавателя, с кем он месяцами собирается увидеться и почему это не происходит.","Мұғалімнен айлар бойы кіммен кездесуді ойлап жүргенін және неге болмағанын сұраңыз."],
u4c109:["Скажите одно предложение в ответ: <i>That sounds like my situation with…</i>","Жауап ретінде бір сөйлем айтыңыз: <i>That sounds like my situation with…</i>"],
u4c201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін картаны басыңыз."],
u4c202:["Показать перевод","Аудармасын көрсету"],
u4c203:["3 · Соедините каждое слово с его значением.","3 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u4c204:["4 · Кто это говорит — тот, кто приглашает, или тот, кого пригласили?","4 · Мұны кім айтады — шақырушы ма әлде шақырылған адам ба?"],
u4c205:["5 · В каждой группе одно слово лишнее. Нажмите на него.","5 · Әр топта бір сөз артық. Соны басыңыз."],
u4c206:["6 · Дополните предложения. Одно-два слова в каждый пропуск.","6 · Сөйлемдерді толықтырыңыз. Әр бос орынға бір-екі сөз."],
u4c301:["Прочитайте эти четыре реплики из записей.","Жазбалардан алынған осы төрт репликаны оқыңыз."],
u4c302:["Посмотрите на первые две. Что идёт после каждой?","Алғашқы екеуіне қараңыз. Әрқайсысынан кейін не келеді?"],
u4c303:["Что вы хотите сделать?","Не істегіңіз келеді?"],
u4c304:["<b>ДВЕ МОДЕЛИ, КОТОРЫЕ НЕ ПУТАЕМ.</b> <i>Would you like <b>to</b> meet?</i>, но <i>Do you fancy <b>meeting</b>?</i> Одна задача, разные формы.","<b>ШАТАСТЫРМАЙТЫН ЕКІ ҮЛГІ.</b> <i>Would you like <b>to</b> meet?</i>, бірақ <i>Do you fancy <b>meeting</b>?</i> Бір мақсат, әр түрлі форма."],
u4c305:["<b>У ОТКАЗА ТРИ ЧАСТИ.</b> Извинение, причина, альтернатива. Уберите любую — и это звучит холодно.","<b>БАС ТАРТУДЫҢ ҮШ БӨЛІГІ БАР.</b> Кешірім, себеп, балама. Біреуін алып тастасаңыз, суық естіледі."],
u4c306:["Ошибка, за которой стоит следить: <i>I can&rsquo;t come</i> само по себе. Добавьте причину и другой день, иначе приглашение на этом умрёт.","Байқау керек қате: жалғыз <i>I can&rsquo;t come</i>. Себеп пен басқа күнді қосыңыз, әйтпесе шақыру сонымен бітеді."],
u4c307:["<b>ДВА СПОСОБА ПРИГЛАСИТЬ.</b> <i>Would you like to…?</i> нейтрально и подходит любому, включая малознакомых. <i>Do you fancy…?</i> — неформально, для друзей. Формы разные: <i>would like</i> берёт <i>to</i> + глагол, <i>fancy</i> берёт <i>-ing</i>.","<b>ШАҚЫРУДЫҢ ЕКІ ЖОЛЫ.</b> <i>Would you like to…?</i> бейтарап, кез келгенге жарайды. <i>Do you fancy…?</i> — достарға арналған бейресми нұсқа. Формалары бөлек: <i>would like</i> + <i>to</i> + етістік, <i>fancy</i> + <i>-ing</i>."],
u4c308:["<b>ПРЕДЛОЖЕНИЕ ВАРИАНТА.</b> <i>How about</i> берёт существительное или форму <i>-ing</i>: <i>How about Friday?</i> / <i>How about meeting at eight?</i> <i>Shall we</i> и <i>Could we</i> берут глагол в начальной форме.","<b>НҰСҚА ҰСЫНУ.</b> <i>How about</i> зат есім немесе <i>-ing</i> алады: <i>How about Friday?</i> / <i>How about meeting at eight?</i> <i>Shall we</i> мен <i>Could we</i> бастапқы етістік алады."],
u4c309:["<b>У ВЕЖЛИВОГО ОТКАЗА ТРИ ЧАСТИ.</b> 1) извинение — <i>I&rsquo;m afraid I can&rsquo;t make Thursday</i>; 2) причина — <i>I&rsquo;m working</i>; 3) альтернатива — <i>Is Sunday any good for you?</i> Отказ только с первой частью звучит так, будто вы не хотите приходить.","<b>СЫПАЙЫ БАС ТАРТУДЫҢ ҮШ БӨЛІГІ.</b> 1) кешірім — <i>I&rsquo;m afraid I can&rsquo;t make Thursday</i>; 2) себеп — <i>I&rsquo;m working</i>; 3) балама — <i>Is Sunday any good for you?</i> Тек бірінші бөлікпен бас тарту келгіңіз келмегендей естіледі."],
u4c310:["<b>ПОДТВЕРЖДЕНИЕ.</b> Повторите договорённость, чтобы у обоих была одна и та же информация: <i>So we&rsquo;re meeting outside the restaurant at eight on Sunday.</i>","<b>РАСТАУ.</b> Екеуіңізде бірдей ақпарат болуы үшін келісімді қайталаңыз: <i>So we&rsquo;re meeting outside the restaurant at eight on Sunday.</i>"],
u4c311:["Две ошибки: <i>Do you fancy to go?</i> (<i>fancy</i> берёт <i>-ing</i>) и голое <i>No, I can&rsquo;t</i>, которое заканчивает разговор.","Екі қате: <i>Do you fancy to go?</i> (<i>fancy</i> + <i>-ing</i>) және әңгімені аяқтайтын жалаң <i>No, I can&rsquo;t</i>."],
u4c312:["Это та же модель вежливости, которую вы встретите в уроке 15, где вы жалуетесь и просите вернуть деньги.","Бұл — 15-сабақта шағымданып, ақшаны қайтаруды сұрағанда кездесетін сол сыпайылық үлгісі."],
u4c313:["Слушайте и читайте. Пять фраз из записей, по одной.","Тыңдап оқыңыз. Жазбалардан бес тіркес, бір-бірден."],
u4c314:["Navigate B1 · Audio 4.13 — фразы голосами самих говорящих.","Navigate B1 · Audio 4.13 — сөйлеушілердің өз дауысындағы тіркестер."],
u4c401:["1 · Выберите правильную форму после каждой фразы.","1 · Әр тіркестен кейінгі дұрыс форманы таңдаңыз."],
u4c402:["2 · Соедините каждый вопрос с ответом.","2 · Әр сұрақты жауабымен сәйкестендіріңіз."],
u4c403:["3 · Оба варианта — правильный английский. Какой вы сказали бы малознакомому человеку?","3 · Екі нұсқа да дұрыс ағылшын тілі. Таныс емес адамға қайсысын айтар едіңіз?"],
u4c404:["4 · Расставьте слова по порядку.","4 · Сөздерді ретімен орналастырыңыз."],
u4c405:["5 · В каждой строке одно лишнее слово. Нажмите на него.","5 · Әр жолда бір артық сөз бар. Соны басыңыз."],
u4c406:["6 · <span class=\"pill-rec\">повторение</span> Дополните ответы формой <i>going to</i> или Present Continuous.","6 · <span class=\"pill-rec\">қайталау</span> Жауаптарды <i>going to</i> немесе Present Continuous формасымен толықтырыңыз."],
u4c407:["Дополнительная отработка","Қосымша жаттығу"],
u4c408:["Перепишите каждую строку так, чтобы она выполняла задачу в скобках, используя данную фразу.","Әр жолды жақшадағы міндетті орындайтындай етіп, берілген тіркеспен қайта жазыңыз."],
u4c409:["7 · У вежливого отказа три части. Какой части не хватает в каждом ответе?","7 · Сыпайы бас тартудың үш бөлігі бар. Әр жауапта қай бөлігі жоқ?"],
u4c501:["1 · Прослушайте два голосовых сообщения. Чего хочет каждый звонивший?","1 · Екі дауыстық хабарламаны тыңдаңыз. Әр қоңырау шалушы не қалайды?"],
u4c502:["2 · Прослушайте сообщение 1 ещё раз. Дополните детали.","2 · 1-хабарламаны тағы тыңдаңыз. Мәліметтерді толықтырыңыз."],
u4c503:["3 · Теперь прослушайте два ответных звонка. О чём они договариваются в каждом?","3 · Енді екі жауап қоңырауын тыңдаңыз. Әрқайсысында не туралы келіседі?"],
u4c504:["4 · Прослушайте девять фраз. Что делает каждая?","4 · Тоғыз тіркесті тыңдаңыз. Әрқайсысы не істейді?"],
u4c505:["Нажмите на номер, чтобы прослушать фразу ещё раз. Именно эти девять фраз вы используете в ролевой игре.","Тіркесті қайта тыңдау үшін нөмірді басыңыз. Дәл осы тоғыз тіркесті рөлдік ойында қолданасыз."],
u4c506:["5 · Ещё один разговор. Послушайте и дополните его.","5 · Тағы бір әңгіме. Тыңдап, оны толықтырыңыз."],
u4c601:["Прочитайте оба письма. Вы читаете их как автор — ищите части, которые сможете использовать сами.","Екі хатты да оқыңыз. Оларды автор ретінде оқисыз — өзіңіз қолдана алатын бөліктерді іздеңіз."],
u4c602:["1 · Расставьте четыре части приглашения в том порядке, в котором они идут.","1 · Шақырудың төрт бөлігін келу ретімен орналастырыңыз."],
u4c603:["2 · Найдите в двух письмах фразу, которая выполняет каждую задачу. Напишите её точно так, как она есть.","2 · Екі хаттан әр міндетті орындайтын тіркесті табыңыз. Оны дәл сол күйінде жазыңыз."],
u4c604:["3 · В какое письмо попала бы каждая строка — в это, к другу, или в формальное, к рабочему контакту?","3 · Әр жол қай хатқа жатады — досқа жазылғанына ма әлде жұмыс контактісіне жазылған ресмиіне ме?"],
u4c605:["4 · Почему ответ работает? Выберите все верные варианты.","4 · Жауап неге тиімді? Барлық дұрыс нұсқаны таңдаңыз."],
u4c701:["Полезные фразы","Пайдалы сөз тіркестері"],
u4c702:["1 · Работа в парах. Прочитайте только свою карточку. Не показывайте её партнёру.","1 · Жұппен жұмыс. Тек өз картаңызды оқыңыз. Оны серіктесіңізге көрсетпеңіз."],
u4c703:["2 · Работа в парах. Проведите разговор. Используйте блок полезных фраз.","2 · Жұппен жұмыс. Әңгімені жүргізіңіз. Пайдалы тіркестер блогын қолданыңыз."],
u4c704:["Не пишите сценарий. Начните с <i>Are you doing anything on Friday the 20th?</i> и посмотрите, куда это приведёт.","Сценарий жазбаңыз. <i>Are you doing anything on Friday the 20th?</i> дегеннен бастап, қайда апаратынын көріңіз."],
u4c705:["3 · Поменяйтесь карточками и повторите со второй ситуацией.","3 · Карталарды ауыстырып, екінші жағдаймен қайталаңыз."],
u4c706:["Второй раз — это то, ради чего всё делается. Используйте минимум четыре фразы из блока, по одной из каждой строки.","Екінші рет — бәрі соның үшін. Блоктан кемінде төрт тіркес, әр жолдан біреуін қолданыңыз."],
u4c707:["Преподавателю","Мұғалімге"],
u4c708:["Обратная связь после задания: одна хорошо использованная фраза и одна, которую стоит попробовать в следующий раз. Слушайте, не появляется ли <i>fancy to</i> и отказы без альтернативы. Не исправляйте во время ролевой игры.","Тапсырмадан кейінгі кері байланыс: жақсы қолданылған бір тіркес және келесіде байқап көретін біреуі. <i>Fancy to</i> мен баламасыз бас тартуларды байқаңыз. Рөлдік ойын кезінде түзетпеңіз."],
u4c709:["1 · Прочитайте свою карточку. У преподавателя другая.","1 · Өз картаңызды оқыңыз. Мұғалімде басқасы бар."],
u4c710:["2 · Работа с преподавателем. Проведите разговор. Используйте блок полезных фраз.","2 · Мұғаліммен жұмыс. Әңгімені жүргізіңіз. Пайдалы тіркестер блогын қолданыңыз."],
u4c711:["3 · Поменяйтесь ролями с преподавателем и проведите вторую ситуацию.","3 · Мұғаліммен рөл ауыстырып, екінші жағдайды өткізіңіз."],
u4c712:["Проверяйте после, а не во время: одна хорошо использованная фраза и одна, которую стоит попробовать в следующий раз.","Тапсырма кезінде емес, кейін тексеріңіз: жақсы қолданылған бір тіркес және келесіде байқап көретін біреуі."],
u4c713:["1 · Спланируйте приглашение, прежде чем писать его.","1 · Шақыруды жазбас бұрын жоспарлаңыз."],
u4c714:["Вы организуете что-то на день рождения друга. Сначала решите повод, день, место и время.","Досыңыздың туған күніне бірдеңе ұйымдастырасыз. Алдымен себебін, күнін, орнын және уақытын шешіңіз."],
u4c715:["Банк фраз","Тіркестер банкі"],
u4c716:["2 · Теперь напишите приглашение. Пятьдесят–семьдесят слов.","2 · Енді шақыруды жазыңыз. Елу-жетпіс сөз."],
u4c717:["3 · Теперь напишите ответ, который вам меньше всего хотелось бы получить: вежливый отказ с альтернативой.","3 · Енді алғыңыз ең келмейтін жауапты жазыңыз: баламасы бар сыпайы бас тарту."],
u4c718:["Сорок–шестьдесят слов и все три части отказа: тёплая реакция, причина, альтернатива.","Қырық-алпыс сөз және бас тартудың үш бөлігі: жылы жауап, себеп, балама."],
u4c719:["4 · Проверьте оба своих письма, прежде чем куда-либо их отправлять.","4 · Екі хатыңызды да жіберер алдында тексеріңіз."],
u4c801:["Отметьте всё, что вы уже умеете.","Меңгергеніңіздің бәрін белгілеңіз."],
u4c802:["Преподавателю","Мұғалімге"],
u4c803:["Завершите уроком-чеклистом. Скажите вслух, что сегодня вернулись обе формы будущего — в упражнении 6 и по всей ролевой игре. Затем скажите, что дальше идёт итоговый тест по Unit 4 и что его можно проходить сколько угодно раз.","Сабақты чек-парақпен аяқтаңыз. Бүгін екі болашақ формасы да оралғанын дауыстап айтыңыз — 6-жаттығуда және рөлдік ойын бойында. Содан кейін алда Unit 4 қорытынды тесті тұрғанын және оны қалағанша өтуге болатынын айтыңыз."],
u4r101:["Часть 1 · Грамматика","1-бөлім · Грамматика"],
u4r102:["Выберите правильную форму.","Дұрыс форманы таңдаңыз."],
u4r103:["Поставьте глагол в скобках в правильную форму.","Жақшадағы етістікті дұрыс түрге қойыңыз."],
u4r104:["Намерение или договорённость? Выберите более естественную форму.","Ниет пе әлде келісім бе? Табиғирақ форманы таңдаңыз."],
u4r105:["В каждом предложении одно лишнее слово. Нажмите на него.","Әр сөйлемде бір артық сөз бар. Соны басыңыз."],
u4r106:["Перепишите предложение так, чтобы смысл остался тем же.","Мағынасы сол қалпында қалатындай етіп сөйлемді қайта жазыңыз."],
u4r107:["Часть 2 · Лексика","2-бөлім · Лексика"],
u4r108:["Дополните каждое предложение одним словом или фразой.","Әр сөйлемді бір сөзбен немесе тіркеспен толықтырыңыз."],
u4r109:["Выберите правильное слово.","Дұрыс сөзді таңдаңыз."],
u4r110:["В каждой группе одно слово лишнее. Нажмите на него.","Әр топта бір сөз артық. Соны басыңыз."],
u4r111:["Часть 3 · Функциональный язык","3-бөлім · Функционалдық тіл"],
u4r112:["Выберите правильную фразу.","Дұрыс тіркесті таңдаңыз."],
u4r113:["Дополните диалог.","Диалогты толықтырыңыз."],
u4r114:["Расставьте три части вежливого отказа в обычном порядке.","Сыпайы бас тартудың үш бөлігін әдеттегі ретімен орналастырыңыз."],
u4a410:["8 · Дополните абзац. По одному слову или фразе в каждый пропуск.","8 · Абзацты толықтырыңыз. Әр бос орынға бір сөз немесе тіркес."],
u4b410:["9 · Дополните абзац. Используйте ту форму будущего, которой требует смысл.","9 · Абзацты толықтырыңыз. Мағына талап ететін болашақ формасын қолданыңыз."],
u4c410:["8 · Дополните диалог. По одному слову или фразе в каждый пропуск.","8 · Диалогты толықтырыңыз. Әр бос орынға бір сөз немесе тіркес."],
u4a01:["Распределите: это постоянная часть улицы или происходит прямо сейчас?","Бөліңіз: бұл көшенің тұрақты бөлігі ме, әлде дәл қазір болып жатыр ма?"],
u4a02:["Эта сортировка — и есть сегодняшняя грамматика. Поймёте почему на этапе 3.","Бұл бөлу — бүгінгі грамматика. Себебін 3-кезеңде түсінесіз."],
u4a03:["Запишите","Жазып қойыңыз"],u4a04:["Обсудите","Талқылаңыз"],
u4b01:["Прочитайте слова. Нажмите на карточку — увидите пример и сочетания. Динамик — произношение.","Сөздерді оқыңыз. Картаны бассаңыз — мысал мен тіркестер. Динамик — айтылуы."],
u4b02:["Показать перевод","Аудармасын көрсету"],
u4b03:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u4b04:["3 · Два слова — одно значение. Послушайте ударение.","3 · Екі сөз — бір мағына. Екпінді тыңдаңыз."],
u4b05:["В этих составных существительных ударение падает на первую часть.","Бұл құрама зат есімдерде екпін бірінші бөлікке түседі."],
u4b06:["4 · Три уличные профессии. Кто чем занимается?","4 · Үш көше мамандығы. Кім немен айналысады?"],
u4b07:["Все трое работают на улице, но делают очень разные вещи.","Үшеуі де далада жұмыс істейді, бірақ істері мүлдем бөлек."],
u4b08:["5 · Какая эта улица? Эти три слова легко перепутать.","5 · Бұл қандай көше? Бұл үш сөзді шатастыру оңай."],
u4b09:["crowded — слишком много людей · lively — энергия, которая нравится · dull — ничего не происходит","crowded — адам тым көп · lively — ұнайтын қызу тіршілік · dull — ештеңе болмайды"],
u4b10:["6 · Найдите лишнее.","6 · Артығын табыңыз."],
u4b11:["7 · Сделайте это правдой о себе.","7 · Мұны өзіңіз туралы шындыққа айналдырыңыз."],
u4b12:["7 · Скажите вслух. Опишите свой район.","7 · Дауыстап айтыңыз. Өз ауданыңызды сипаттаңыз."],
u4c01:["Прочитайте, что говорит Гарри, лондонский дворник.","Лондондық көше тазалаушы Гарридің сөзін оқыңыз."],
u4c02:["Какие предложения о работе вообще, а какие — про сегодня?","Қай сөйлемдер жұмыс туралы жалпы, қайсысы бүгін туралы?"],
u4c03:["Два времени рядом","Екі шақ қатар"],
u4c04:["PRESENT SIMPLE. Рутина и то, что всегда верно. -s для he/she/it, do/does для отрицаний и вопросов.","PRESENT SIMPLE. Күнделікті және әрқашан дұрыс нәрсе. he/she/it үшін -s, болымсыз бен сұраққа do/does."],
u4c05:["PRESENT CONTINUOUS. am/is/are + -ing. Сейчас, около сейчас или временно.","PRESENT CONTINUOUS. am/is/are + -ing. Қазір, осы кезде немесе уақытша."],
u4c06:["ГЛАГОЛЫ СОСТОЯНИЯ. know, like, want, need остаются в простой форме.","КҮЙ ЕТІСТІКТЕРІ. know, like, want, need қарапайым формада қалады."],
u4c07:["Нельзя: «He work outside», «I am knowing», и Present Simple там, где имеется в виду только сегодня.","Болмайды: «He work outside», «I am knowing», және тек бүгінді білдіретін жерде Present Simple."],
u4c08:["В уроке 5 эти времена встретятся внутри придаточных определительных.","5-сабақта бұл шақтар анықтауыш бағыныңқылар ішінде кездеседі."],
u4c09:["Гарри, дворник, из записи учебника.","Оқулық жазбасынан көше тазалаушы Гарри."],
u4d04:["PRESENT SIMPLE — ФОРМА. Голый глагол плюс -s для he/she/it; -es после -ch, -sh, -ss, -x, -o; -ies после согласной + y. Отрицание и вопрос через do/does.","PRESENT SIMPLE — ФОРМА. Таза етістік және he/she/it үшін -s; -ch, -sh, -ss, -x, -o кейін -es; дауыссыз + y кейін -ies."],
u4d05:["PRESENT SIMPLE — УПОТРЕБЛЕНИЕ. Факты, привычки, постоянные ситуации. Это время того, какая улица обычно.","PRESENT SIMPLE — ҚОЛДАНЫЛУЫ. Фактілер, әдеттер, тұрақты жағдайлар."],
u4d06:["PRESENT CONTINUOUS — ФОРМА. am/is/are + -ing. Правописание как у прошедшего продолженного.","PRESENT CONTINUOUS — ФОРМА. am/is/are + -ing. Жазылуы өткен ұзақ шақпен бірдей."],
u4d07:["PRESENT CONTINUOUS — УПОТРЕБЛЕНИЕ. Три задачи: происходит сейчас, временно, меняется.","PRESENT CONTINUOUS — ҚОЛДАНЫЛУЫ. Үш қызмет: қазір болып жатыр, уақытша, өзгеруде."],
u4d08:["ДВА ВМЕСТЕ. Один говорящий часто использует оба сразу, потому что оба верны.","ЕКЕУІ БІРГЕ. Бір сөйлеуші жиі екеуін де қатар қолданады, өйткені екеуі де дұрыс."],
u4d09:["ГЛАГОЛЫ СОСТОЯНИЯ описывают состояние, а не действие, и остаются простыми.","КҮЙ ЕТІСТІКТЕРІ әрекетті емес, күйді білдіреді және қарапайым қалпында қалады."],
u4d10:["Четыре типичные ошибки: пропущенная -s, «I am knowing», «Does he working?», «He is never work late».","Төрт кең тараған қате: -s түсіп қалуы, «I am knowing», «Does he working?», «He is never work late»."],
u4d11:["Наречия частотности из урока 2 возвращаются в задании 6.","2-сабақтағы жиілік үстеулері 6-тапсырмада қайта оралады."],
u4e01:["1 · Какое время требуют слова времени?","1 · Мезгіл сөздері қай шақты талап етеді?"],
u4e02:["2 · Дополните предложения. Напишите правильную форму глагола в скобках.","2 · Сөйлемдерді толықтырыңыз. Жақшадағы етістіктің дұрыс формасын жазыңыз."],
u4e03:["3 · Сделайте отрицание.","3 · Болымсыз түрге айналдырыңыз."],
u4e04:["4 · Расставьте слова, чтобы получился вопрос.","4 · Сұрақ құрау үшін сөздерді ретімен қойыңыз."],
u4e05:["5 · Найдите ошибку. Нажмите на неверное слово.","5 · Қатені табыңыз. Қате сөзді басыңыз."],
u4e06:["6 · повторение · Поставьте наречие частотности на правильное место.","6 · қайталау · Жиілік үстеуін дұрыс орынға қойыңыз."],
u4e07:["Перед основным глаголом — но после be.","Негізгі етістіктің алдында — бірақ be-ден кейін."],
u4e08:["7 · Дополните диалог.","7 · Диалогты толықтырыңыз."],
u4f01:["Перед прослушиванием: трое работают на улице весь день. Что им, по-вашему, в этом нравится?","Тыңдау алдында: үшеуі күні бойы далада жұмыс істейді. Оларға не ұнайды деп ойлайсыз?"],
u4f02:["Выбирайте сколько хотите, затем послушайте и проверьте.","Қалағаныңызша таңдап, содан кейін тыңдап тексеріңіз."],
u4f03:["1 · Послушайте один раз. Кто это?","1 · Бір рет тыңдаңыз. Бұл кім?"],
u4f04:["2 · Послушайте ещё раз и впишите детали.","2 · Қайта тыңдап, толық ақпаратты жазыңыз."],
u4f05:["3 · Обычно или сегодня? Выберите, что описывает каждое предложение.","3 · Әдетте ме, әлде бүгін бе? Әр сөйлем нені сипаттайтынын таңдаңыз."],
u4f06:["4 · Майк ненавидит город, Эмма его любит. Кто что говорит?","4 · Майк қаланы жек көреді, Эмма жақсы көреді. Кім не айтады?"],
u4f07:["Обсудите","Талқылаңыз"],
u4h01:["Работайте в парах. Выберите карточку и опишите место.","Жұппен жұмыс істеңіз. Картаны таңдап, орынды сипаттаңыз."],
u4h02:["Выберите карточку и напишите описание.","Картаны таңдап, сипаттама жазыңыз."],
u4h03:["Напишите","Жазыңыз"],u4h04:["Преподавателю","Мұғалімге"],
u4i01:["Отметьте всё, что вы теперь умеете.","Енді қолыңыздан келетіннің бәрін белгілеңіз."],
u4i02:["Преподавателю","Мұғалімге"],
u5a01:["Послушайте три подсказки по очереди. Что описывают?","Үш нұсқауды кезекпен тыңдаңыз. Не сипатталады?"],
u5a02:["Попробуйте угадать уже после первой подсказки.","Бірінші нұсқаудан кейін-ақ болжап көріңіз."],
u5a03:["Это слово было в уроке 4.","Бұл сөз 4-сабақта кездескен."],
u5a04:["Запишите","Жазып қойыңыз"],u5a05:["Обсудите","Талқылаңыз"],
u5b01:["Прочитайте слова. Нажмите на карточку — увидите пример и сочетания. Динамик — произношение.","Сөздерді оқыңыз. Картаны бассаңыз — мысал мен тіркестер. Динамик — айтылуы."],
u5b02:["Показать перевод","Аудармасын көрсету"],
u5b03:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u5b04:["3 · Четыре вещи из ткани. Какая именно?","3 · Матадан жасалған төрт зат. Қайсысы?"],
u5b05:["sheet — плоская, под вами · duvet — толстое, сверху · towel — вытираться · cloth — тряпка для уборки","sheet — жалпақ, астыңызда · duvet — қалың, үстіңізде · towel — сүртіну үшін · cloth — тазалау шүберегі"],
u5b06:["4 · Какая комната? Разложите предметы по местам.","4 · Қай бөлме? Заттарды орнына қойыңыз."],
u5b07:["5 · Выражения с on. Дополните каждое.","5 · on-мен тіркестер. Әрқайсысын толықтырыңыз."],
u5b08:["6 · Ещё три слова из записи.","6 · Жазбадан тағы үш сөз."],
u5c01:["Прочитайте три подсказки из разминки и две строки из сегодняшней записи.","Жаттығудағы үш нұсқау мен бүгінгі жазбадан екі жолды оқыңыз."],
u5c02:["Что делают эти пять слов?","Бұл бес сөз не істейді?"],
u5c03:["Какое слово для какого существительного","Қай зат есімге қай сөз"],
u5c04:["ЧТО ОНИ ДЕЛАЮТ. Придаточное определительное говорит, о каком именно предмете речь.","ОЛАР НЕ ІСТЕЙДІ. Анықтауыш бағыныңқы қай зат туралы екенін нақтылайды."],
u5c05:["КАКОЕ СЛОВО. who — для людей, which — для предметов, where — для мест, that — для людей и предметов.","ҚАЙ СӨЗ. who — адамға, which — затқа, where — орынға, that — екеуіне де."],
u5c06:["ЗАЧЕМ ЭТО НУЖНО. Именно так вы выкручиваетесь, когда слово не вспоминается.","НЕГЕ КЕРЕК. Сөз есіңізге түспегенде дәл осылай шығасыз."],
u5c07:["Нельзя: «the man who he lives here», «the machine where washes the dishes».","Болмайды: «the man who he lives here», «the machine where washes the dishes»."],
u5c08:["В уроке 6 эти конструкции вернутся внутри объяснения дороги.","6-сабақта бұл құрылымдар жол сілтеу ішінде қайта оралады."],
u5c09:["Из записей учебника.","Оқулық жазбаларынан."],
u5d04:["ЧТО ОНИ ДЕЛАЮТ. Придаточное определяет существительное перед ним. Информация обязательная, поэтому запятая не ставится.","ОЛАР НЕ ІСТЕЙДІ. Бағыныңқы алдындағы зат есімді нақтылайды. Ақпарат міндетті, сондықтан үтір қойылмайды."],
u5d05:["КАКОЕ СЛОВО ВЫБРАТЬ. that заменяет и who, и which — в речи это самый частый вариант. Но where нельзя для предмета.","ҚАЙ СӨЗДІ ТАҢДАУ. that who мен which-ті алмастырады. Бірақ зат үшін where қолданылмайды."],
u5d06:["ПОРЯДОК СЛОВ. Относительное слово занимает место подлежащего или дополнения, поэтому его не повторяют.","СӨЗ ТӘРТІБІ. Қатыстық сөз бастауыш не толықтауыш орнын алады, сондықтан қайталанбайды."],
u5d07:["КОГДА МОЖНО ОПУСТИТЬ. Если относительное слово — дополнение, английский часто его убирает. Если подлежащее — оставляют.","ҚАШАН ТҮСІРУГЕ БОЛАДЫ. Қатыстық сөз толықтауыш болса, түсіп қалады. Бастауыш болса, қалады."],
u5d08:["ЗАЧЕМ ЭТОТ УРОК. Слова забывают все. Вместо того чтобы замолчать — описывайте. Something, someone, a place плюс придаточное закроют почти любой пробел.","БҰЛ САБАҚ НЕГЕ КЕРЕК. Сөзді бәрі ұмытады. Үндемей қалудың орнына сипаттаңыз."],
u5d09:["Три ошибки: «the man who he lives here», «the machine where washes», «the house which we're staying».","Үш қате: «the man who he lives here», «the machine where washes», «the house which we're staying»."],
u5d10:["Оба настоящих времени из урока 4 стоят внутри этих придаточных.","4-сабақтағы екі осы шақ та осы бағыныңқылардың ішінде тұр."],
u5e01:["1 · who, which или where?","1 · who, which әлде where?"],
u5e02:["2 · Объедините два предложения в одно.","2 · Екі сөйлемді біріктіріңіз."],
u5e03:["3 · Прочитайте определение. Какой это предмет?","3 · Анықтаманы оқыңыз. Бұл қандай зат?"],
u5e04:["4 · Расставьте слова по порядку.","4 · Сөздерді ретімен қойыңыз."],
u5e05:["5 · Найдите ошибку. Нажмите на неверное слово.","5 · Қатені табыңыз. Қате сөзді басыңыз."],
u5e06:["6 · повторение · Какое время нужно внутри придаточного?","6 · қайталау · Бағыныңқы ішінде қай шақ керек?"],
u5e07:["Правила из урока 4 не меняются от того, что появилось придаточное.","4-сабақтағы ережелер бағыныңқы пайда болғаннан өзгермейді."],
u5f01:["Перед чтением: автор месяц присматривает за домом незнакомых людей.","Оқу алдында: автор бір ай бойы бейтаныс адамдардың үйін күтеді."],
u5f02:["Что, по-вашему, будет самым трудным?","Сіздіңше, ең қиыны не болады?"],
u5f03:["Это предположение, а не ответ.","Бұл болжам, жауап емес."],
u5f04:["1 · Прочитайте один раз. Выберите лучший ответ.","1 · Бір рет оқыңыз. Ең дұрыс жауапты таңдаңыз."],
u5f05:["2 · Автор ни разу не называет эти вещи. Что это?","2 · Автор бұл заттарды бір рет те атамайды. Бұл не?"],
u5f06:["3 · Верно или неверно?","3 · Дұрыс па, бұрыс па?"],
u5f07:["4 · Найдите в тексте слово, которое означает…","4 · Мәтіннен мағынасы сәйкес сөзді табыңыз…"],
u5f08:["Обсудите","Талқылаңыз"],u5f09:["Запишите","Жазып қойыңыз"],
u5g01:["Послушайте трёх говорящих. Чего каждому не хватает из дома?","Үш сөйлеушіні тыңдаңыз. Әрқайсысы үйінен нені сағынады?"],
u5g02:["Аудио 2.6","2.6 аудиосы"],u5g03:["Преподавателю","Мұғалімге"],
u5h01:["Работайте в парах. Выберите карточку и опишите каждый предмет, не называя его.","Жұппен жұмыс істеңіз. Картаны таңдап, әр затты атамай сипаттаңыз."],
u5h02:["Выберите карточку и напишите определение для каждого предмета.","Картаны таңдап, әр затқа анықтама жазыңыз."],
u5h03:["Напишите","Жазыңыз"],u5h04:["Преподавателю","Мұғалімге"],
u5i01:["Отметьте всё, что вы теперь умеете.","Енді қолыңыздан келетіннің бәрін белгілеңіз."],
u5i02:["Преподавателю","Мұғалімге"],
u6a01:["Начните от автовокзала. Выполните четыре инструкции. Где вы оказались?","Автовокзалдан бастаңыз. Төрт нұсқауды орындаңыз. Қайда келдіңіз?"],
u6a02:["Если не уверены, перечитайте четвёртую инструкцию.","Күмәндансаңыз, төртінші нұсқауды қайта оқыңыз."],
u6a03:["Запишите","Жазып қойыңыз"],u6a04:["Обсудите","Талқылаңыз"],
u6b01:["Прочитайте слова. Нажмите на карточку — увидите пример и сочетания. Динамик — произношение.","Сөздерді оқыңыз. Картаны бассаңыз — мысал мен тіркестер. Динамик — айтылуы."],
u6b02:["Показать перевод","Аудармасын көрсету"],
u6b03:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u6b04:["3 · Вдоль улицы или поперёк неё?","3 · Көше бойымен бе, әлде оны қиып өту ме?"],
u6b05:["go past — двигаться вдоль улицы · cross — перейти с одной стороны на другую","go past — көше бойымен жүру · cross — бір жақтан екінші жаққа өту"],
u6b06:["4 · Где именно? Выберите нужное слово.","4 · Нақты қайда? Керекті сөзді таңдаңыз."],
u6b07:["5 · Ещё четыре слова из этого юнита.","5 · Осы бөлімнен тағы төрт сөз."],
u6c01:["Прочитайте четыре строки из сегодняшних записей.","Бүгінгі жазбалардан төрт жолды оқыңыз."],
u6c02:["В какой форме стоят инструкции?","Нұсқаулар қандай формада тұр?"],
u6c03:["Четыре хода","Төрт қадам"],
u6c04:["ИМПЕРАТИВ. Просто голый глагол: Go, Turn, Cross, Take. Ни подлежащего, ни времени.","БҰЙРЫҚ РАЙ. Таза етістік: Go, Turn, Cross, Take. Бастауыш та, шақ та жоқ."],
u6c05:["ПРЕДЛОГИ ДЕЛАЮТ ВСЮ РАБОТУ: along, past, through, across, out of, into.","КӨМЕКШІ СӨЗДЕР БАРЛЫҒЫН ШЕШЕДІ: along, past, through, across, out of, into."],
u6c06:["СХЕМА ОБМЕНА. Спросить → объяснить → назвать место → переспросить. Последнее не опционально.","АЛМАСУ СҰЛБАСЫ. Сұрау → түсіндіру → орынды атау → қайта сұрау."],
u6c07:["Нельзя: «go past to the bank», «cross through the road», «take second turning» без the.","Болмайды: «go past to the bank», «cross through the road», «take second turning» — the керек."],
u6c08:["Это последний урок Unit 2. Дальше — итоговый тест.","Бұл — 2-бөлімнің соңғы сабағы. Әрі қарай қорытынды тест."],
u6c09:["Пять фраз из записей учебника.","Оқулық жазбаларынан бес тіркес."],
u6d04:["ИМПЕРАТИВ. Инструкция — это голый глагол без подлежащего. Выбирать время не нужно, поэтому вся сложность в предлоге.","БҰЙРЫҚ РАЙ. Нұсқау — бастауышсыз таза етістік. Шақ таңдаудың қажеті жоқ, бүкіл қиындық көмекші сөзде."],
u6d05:["ПРЕДЛОГИ ДВИЖЕНИЯ несут смысл. cross уже содержит «поперёк», поэтому cross the road, а не cross through.","ҚОЗҒАЛЫС КӨМЕКШІЛЕРІ мағына береді. cross-та «қиып өту» бар, сондықтан cross the road."],
u6d06:["КОГДА ОСТАНОВИТЬСЯ. Инструкция без конечной точки бесполезна. Английский использует until.","ҚАШАН ТОҚТАУ КЕРЕК. Соңғы нүктесіз нұсқау пайдасыз. Ағылшын тілінде until қолданылады."],
u6d07:["КАК УКАЗАТЬ ЗДАНИЕ: on the left, on the corner, opposite, next to. Здесь возвращаются придаточные из урока 5.","ҒИМАРАТТЫ ҚАЛАЙ КӨРСЕТУ: on the left, on the corner, opposite, next to."],
u6d08:["СХЕМА ДИАЛОГА. Во всех трёх записях одни и те же четыре хода, и последний — переспрос — учащиеся пропускают чаще всего.","ДИАЛОГ СҰЛБАСЫ. Үш жазбада да бірдей төрт қадам, соңғысын оқушылар жиі өткізіп жібереді."],
u6d09:["Четыре ошибки: «go past to», «cross through», «take second turning», «you go straight on» вместо императива.","Төрт қате: «go past to», «cross through», «take second turning», бұйрық райдың орнына «you go»."],
u6d10:["Придаточные из урока 5 описывают ориентиры, Present Continuous из урока 4 говорит, где вы сейчас.","5-сабақтағы бағыныңқылар бағдарды сипаттайды, 4-сабақтағы Present Continuous қазір қайда екеніңізді айтады."],
u6e01:["1 · Говорящий спрашивает, объясняет, указывает место или переспрашивает?","1 · Сөйлеуші сұрай ма, түсіндіре ме, орын көрсете ме, әлде қайта сұрай ма?"],
u6e02:["2 · Какой предлог?","2 · Қай көмекші сөз?"],
u6e03:["3 · Дополните инструкции одним словом.","3 · Нұсқауларды бір сөзбен толықтырыңыз."],
u6e04:["4 · Найдите ошибку. Нажмите на неверное слово.","4 · Қатені табыңыз. Қате сөзді басыңыз."],
u6e05:["5 · Расставьте указания по порядку.","5 · Нұсқауларды ретімен қойыңыз."],
u6e06:["6 · повторение · Опишите ориентир словом who, which или where.","6 · қайталау · Бағдарды who, which немесе where арқылы сипаттаңыз."],
u6f01:["Перед прослушиванием: что, по-вашему, всегда делает тот, кто хорошо объясняет дорогу?","Тыңдау алдында: жолды жақсы түсіндіретін адам не істейді деп ойлайсыз?"],
u6f02:["Выбирайте сколько хотите, затем послушайте и проверьте.","Қалағаныңызша таңдап, содан кейін тыңдап тексеріңіз."],
u6f03:["1 · Послушайте первый диалог. Расставьте маршрут по порядку.","1 · Бірінші диалогты тыңдаңыз. Бағытты ретімен қойыңыз."],
u6f04:["2 · Послушайте диалоги 2 и 3. Ответьте на вопросы.","2 · 2 және 3 диалогтарды тыңдаңыз. Сұрақтарға жауап беріңіз."],
u6f05:["3 · Все три диалога заканчиваются одинаково. Что всегда делает спрашивающий?","3 · Үш диалог та бірдей аяқталады. Сұраған адам не істейді?"],
u6g01:["Прочитайте всю переписку целиком. Пока ничего не делайте.","Барлық хат алмасуды толық оқыңыз. Әзірге ештеңе істемеңіз."],
u6g02:["1 · Что делает каждое сообщение?","1 · Әр хабарлама не істейді?"],
u6g03:["2 · Найдите язык в переписке.","2 · Хат алмасудан тілдік бірліктерді табыңыз."],
u6h01:["Работайте в парах. Один спрашивает, другой объясняет. Потом поменяйтесь.","Жұппен жұмыс істеңіз. Біреуі сұрайды, екіншісі түсіндіреді. Содан кейін ауысыңыз."],
u6h02:["Выберите карточку и напишите переписку.","Картаны таңдап, хат алмасуды жазыңыз."],
u6h03:["Напишите","Жазыңыз"],u6h04:["Преподавателю","Мұғалімге"],
u6i01:["Отметьте всё, что вы теперь умеете.","Енді қолыңыздан келетіннің бәрін белгілеңіз."],
u6i02:["Преподавателю","Мұғалімге"],
u7a01:["Посмотрите на шесть действий. Выберите те, которые вы делали.","Алты әрекетке қараңыз. Өзіңіз жасағандарын таңдаңыз."],
u7a02:["Выберите ответы, затем напишите одно предложение о последнем из них.","Жауаптарыңызды таңдап, соңғысы туралы бір сөйлем жазыңыз."],
u7a03:["Выберите ответы, затем расскажите преподавателю об одном из них.","Жауаптарыңызды таңдап, біреуі туралы мұғалімге айтыңыз."],
u7a04:["Выберите ответы, затем сравните с партнёром.","Жауаптарыңызды таңдап, серіктесіңізбен салыстырыңыз."],
u7a05:["Здесь нет правильного ответа. Выбирайте сколько хотите.","Мұнда дұрыс жауап жоқ. Қалағаныңызша таңдаңыз."],
u7a06:["Запишите","Жазып қойыңыз"],
u7a07:["Обсудите","Талқылаңыз"],
u7a08:["Посмотрите на название урока. Как вы думаете, что произошло?","Сабақтың атауына қараңыз. Не болды деп ойлайсыз?"],
u7a09:["Это предположение. Ответ узнаете на этапе 5.","Бұл болжам. Жауабын 5-кезеңде білесіз."],
u7b01:["Прочитайте слова. Нажмите на карточку — увидите пример и сочетания. Динамик — произношение.","Сөздерді оқыңыз. Картаны бассаңыз — мысал мен тіркестер. Динамик — айтылуы."],
u7b02:["Показать перевод","Аудармасын көрсету"],
u7b03:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u7b04:["3 · Какое слово подходит? Эти пары легко перепутать.","3 · Қай сөз сәйкес келеді? Бұл жұптарды шатастыру оңай."],
u7b05:["Прочитайте предложение целиком. Оба слова о движении, но подходит только одно.","Сөйлемді толық оқыңыз. Екі сөз де қозғалыс туралы, бірақ біреуі ғана сәйкес."],
u7b06:["5 · В какую сторону? Дополните предложения словами из рамки.","5 · Қай бағытта? Сөйлемдерді жақтаудағы сөздермен толықтырыңыз."],
u7b07:["Эти короткие слова несут направление. Без них история не движется.","Бұл қысқа сөздер бағытты білдіреді. Оларсыз әңгіме қозғалмайды."],
u7b08:["6 · Найдите лишнее. Какое слово не подходит к остальным трём?","6 · Артығын табыңыз. Қай сөз қалған үшеуіне сәйкес келмейді?"],
u7c01:["Прочитайте эти четыре предложения из сегодняшней записи.","Бүгінгі жазбадан осы төрт сөйлемді оқыңыз."],
u7c02:["Что происходит с основным глаголом после didn't и did?","didn't және did-тен кейін негізгі етістікке не болады?"],
u7c03:["Четыре формы","Төрт форма"],
u7c04:["ФОРМА. Правильные глаголы получают -ed. Неправильные меняются и требуют заучивания.","ФОРМА. Дұрыс етістіктерге -ed жалғанады. Бұрыс етістіктер өзгереді, жаттау керек."],
u7c05:["ОТРИЦАНИЕ И ВОПРОС. didn't + начальная форма, did + лицо + начальная форма.","БОЛЫМСЫЗ ЖӘНЕ СҰРАУЛЫ. didn't + бастапқы форма, did + жақ + бастапқы форма."],
u7c06:["BE — ИСКЛЮЧЕНИЕ. was / were не требуют did.","BE — ЕРЕКШЕЛІК. was / were did-ті қажет етпейді."],
u7c07:["Нельзя: «He didn't went», «Did he landed?», «I was go».","Болмайды: «He didn't went», «Did he landed?», «I was go»."],
u7c08:["В уроке 8 это время встретится с Past Continuous.","8-сабақта бұл шақ Past Continuous-пен кездеседі."],
u7c09:["Пять предложений из записи учебника.","Оқулық жазбасынан бес сөйлем."],
u7d04:["ФОРМА. Правильные глаголы получают -ed; глагол на -e добавляет только -d; короткий глагол удваивает последнюю букву. Неправильные глаголы учат по одному.","ФОРМА. Дұрыс етістіктерге -ed; -e-ге аяқталса -d; қысқа етістік соңғы әріпті екі етеді. Бұрыс етістіктер жеке жатталады."],
u7d05:["ОТРИЦАНИЕ И ВОПРОС строятся через did, поэтому основной глагол возвращается в начальную форму. Одна прошедшая форма на предложение.","БОЛЫМСЫЗ ЖӘНЕ СҰРАУЛЫ did арқылы жасалады, сондықтан негізгі етістік бастапқы формаға оралады."],
u7d06:["BE — ИСКЛЮЧЕНИЕ. was / were никогда не берут did; вопрос — просто перестановка.","BE — ЕРЕКШЕЛІК. was / were ешқашан did алмайды; сұрақ — тек орын ауыстыру."],
u7d07:["ЗВУЧАНИЕ -ED. Одно написание, три звука: /t/, /d/, /ɪd/.","-ED ДЫБЫСЫ. Бір жазылу, үш дыбыс: /t/, /d/, /ɪd/."],
u7d08:["Три типичные ошибки: прошедшая форма после didn't и did, и was с основным глаголом.","Үш кең тараған қате: didn't пен did-тен кейінгі өткен шақ формасы және was + негізгі етістік."],
u7d09:["Придаточные определительные из Unit 2 возвращаются сегодня.","2-бөлімдегі анықтауыш бағыныңқылар бүгін қайта оралады."],
u7e01:["1 · Правильный или неправильный? Выберите форму прошедшего времени.","1 · Дұрыс па, бұрыс па? Өткен шақ формасын таңдаңыз."],
u7e02:["2 · Дополните историю. Напишите Past Simple глагола в скобках.","2 · Әңгімені толықтырыңыз. Жақшадағы етістіктің Past Simple формасын жазыңыз."],
u7e03:["3 · Сделайте отрицание. Напишите два недостающих слова.","3 · Болымсыз түрге айналдырыңыз. Екі сөзді жазыңыз."],
u7e04:["Вспомните, что происходит с основным глаголом.","Негізгі етістікке не болатынын еске түсіріңіз."],
u7e05:["4 · Расставьте слова, чтобы получился вопрос.","4 · Сұрақ құрау үшін сөздерді ретімен қойыңыз."],
u7e06:["5 · Найдите ошибку. Нажмите на неверное слово в каждом предложении.","5 · Қатені табыңыз. Әр сөйлемдегі қате сөзді басыңыз."],
u7e07:["6 · повторение · Соедините два предложения словами who, which или where.","6 · қайталау · Екі сөйлемді who, which немесе where арқылы біріктіріңіз."],
u7e08:["Придаточные определительные — из Unit 2. Выберите слово для человека, предмета или места.","Анықтауыш бағыныңқылар — 2-бөлімнен. Адам, зат немесе орын үшін сөз таңдаңыз."],
u7f01:["Перед чтением: автор работал в наземной команде, а не в капсуле.","Оқу алдында: автор капсулада емес, жердегі топта жұмыс істеген."],
u7f02:["Что, по-вашему, больше всего беспокоило наземную команду?","Сіздің ойыңызша, жердегі топты не көбірек алаңдатты?"],
u7f03:["Это предположение, а не ответ.","Бұл болжам, жауап емес."],
u7f04:["1 · Прочитайте один раз. Ответьте на два вопроса.","1 · Бір рет оқыңыз. Екі сұраққа жауап беріңіз."],
u7f05:["2 · Прочитайте ещё раз. Верно или неверно?","2 · Қайта оқыңыз. Дұрыс па, бұрыс па?"],
u7f06:["3 · Расставьте шесть событий в порядке, в котором они произошли.","3 · Алты оқиғаны болған ретімен қойыңыз."],
u7f07:["4 · Найдите в тексте слово, которое означает…","4 · Мәтіннен мағынасы сәйкес сөзді табыңыз…"],
u7f08:["Обсудите","Талқылаңыз"],
u7f09:["Запишите","Жазып қойыңыз"],
u7g01:["Послушайте радиопрограмму. Затем впишите числа.","Радиобағдарламаны тыңдаңыз. Содан кейін сандарды жазыңыз."],
u7g02:["Можно послушать целиком или использовать четыре кнопки для повтора.","Толық тыңдауға немесе төрт түймемен қайталауға болады."],
u7g03:["Преподавателю","Мұғалімге"],
u7h01:["Работайте в парах. Выберите карточку и расскажите партнёру, что произошло.","Жұппен жұмыс істеңіз. Картаны таңдап, серіктесіңізге не болғанын айтыңыз."],
u7h02:["Выберите карточку и напишите, что произошло.","Картаны таңдап, не болғанын жазыңыз."],
u7h03:["Напишите","Жазыңыз"],
u7h04:["Преподавателю","Мұғалімге"],
u7i01:["Отметьте всё, что вы теперь умеете.","Енді қолыңыздан келетіннің бәрін белгілеңіз."],
u7i02:["Преподавателю","Мұғалімге"],
u7b09:["4 · Слова, которые идут вместе. Выберите слово, завершающее фразу.","4 · Бірге қолданылатын сөздер. Тіркесті аяқтайтын сөзді таңдаңыз."],
u7b10:["Английский закрепляет некоторые пары. Учить пару быстрее, чем слово отдельно.","Ағылшын тілі кейбір тіркестерді бекітеді. Тіркесті үйрену жеке сөзден жылдамырақ."],
u7b11:["7 · Без подсказок. Напишите пропущенное слово по памяти.","7 · Көмексіз. Түсіп қалған сөзді жадыңыздан жазыңыз."],
u7b12:["Сначала закройте карточки выше. Именно извлечение из памяти закрепляет слово.","Алдымен жоғарыдағы карталарды жабыңыз. Жадтан шығару сөзді бекітеді."],
u7b13:["8 · Сделайте это правдой о себе.","8 · Мұны өзіңіз туралы шындыққа айналдырыңыз."],
u7b14:["8 · Скажите вслух. Используйте три сегодняшних слова о своей жизни.","8 · Дауыстап айтыңыз. Бүгінгі үш сөзді өз өміріңіз туралы қолданыңыз."],
u7c10:["Одно написание, три звука. Послушайте и распределите глаголы по колонкам.","Бір жазылу, үш дыбыс. Тыңдап, етістіктерді бағандарға бөліңіз."],
u7c11:["Только распознавание — повторять вслух не нужно.","Тек тану — дауыстап қайталаудың қажеті жоқ."],
u7c12:["Прошедшее или настоящее? Выберите форму, которую требуют слова времени.","Өткен бе, осы шақ па? Мезгіл сөздері талап ететін форманы таңдаңыз."],
u7e05b:["5 · Перепишите предложение так, чтобы смысл сохранился.","5 · Мағынасы сақталатындай етіп сөйлемді қайта жазыңыз."],
u7e09:["8 · Дополните диалог.","8 · Диалогты толықтырыңыз."],
u7e10:["Двое коллег на следующее утро после прыжка.","Секірістен кейінгі таңда екі әріптес."],
u7f10:["5 · Теперь прочитайте текст B.","5 · Енді B мәтінін оқыңыз."],
u7f11:["6 · Текст A, текст B или оба? Выберите для каждого предложения.","6 · A мәтіні, B мәтіні әлде екеуі де ме? Әр сөйлем үшін таңдаңыз."],
u7f12:["7 · В текстах это прямо не сказано. Какой ответ лучший?","7 · Мәтіндерде бұл тікелей айтылмаған. Қай жауап дұрыс?"],
u8a01:["Соотнесите ситуацию слева с чувством справа.","Сол жақтағы жағдайды оң жақтағы сезіммен сәйкестендіріңіз."],
u8a02:["Единственно правильного ответа нет — выберите то, что верно для вас.","Бір ғана дұрыс жауап жоқ — өзіңізге сәйкесін таңдаңыз."],
u8a03:["Все эти слова вернутся на этапе 2.","Бұл сөздердің бәрі 2-кезеңде қайта кездеседі."],
u8a04:["Запишите","Жазып қойыңыз"],u8a05:["Обсудите","Талқылаңыз"],
u8b01:["Прочитайте слова. Нажмите на карточку — увидите пример и сочетания. Динамик — произношение.","Сөздерді оқыңыз. Картаны бассаңыз — мысал мен тіркестер. Динамик — айтылуы."],
u8b02:["Показать перевод","Аудармасын көрсету"],
u8b03:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u8b04:["3 · Насколько сильно и когда? Эти четыре слова близки, но не одинаковы.","3 · Қаншалықты күшті және қашан? Бұл төрт сөз ұқсас, бірақ бірдей емес."],
u8b05:["anxious — тревога о будущем · nervous — мандраж прямо перед · stressed — перегруз · frightened — страх сейчас","anxious — болашаққа алаңдау · nervous — алдында қобалжу · stressed — шамадан тыс жүктеме · frightened — қазіргі қорқыныш"],
u8b06:["4 · Какой предлог? Учите слово вместе с предлогом.","4 · Қай көмекші сөз? Сөзді көмекшісімен бірге жаттаңыз."],
u8b07:["5 · Из прилагательного в наречие. Образуйте слово, отвечающее на вопрос «как».","5 · Сын есімнен үстеу жасаңыз — «қалай» сұрағына жауап беретін сөз."],
u8b08:["Большинство добавляет -ly. Слово на согласную + -y меняется на -ily.","Көбі -ly жалғайды. Дауыссыз + -y болса, -ily болады."],
u8b09:["6 · Послушайте восьмерых. Что чувствует каждый?","6 · Сегіз адамды тыңдаңыз. Әрқайсысы не сезінеді?"],
u8b10:["Проиграйте каждого говорящего, затем выберите.","Әр сөйлеушіні тыңдап, содан кейін таңдаңыз."],
u8b11:["7 · Ещё двое. В чём проблема?","7 · Тағы екеуі. Мәселе неде?"],
u8b12:["Эти двое чувствуют то, чего мы сегодня не изучали. Слушайте, что произошло, а не слово.","Бұл екеуі бүгін оқымаған нәрсені сезінеді. Сөзді емес, не болғанын тыңдаңыз."],
u8b13:["8 · Сделайте это правдой о себе.","8 · Мұны өзіңіз туралы шындыққа айналдырыңыз."],
u8b14:["8 · Скажите вслух. Три правдивых предложения о вашей неделе.","8 · Дауыстап айтыңыз. Аптаңыз туралы үш шын сөйлем."],
u8c01:["Прочитайте три предложения.","Үш сөйлемді оқыңыз."],
u8c02:["Какое действие началось первым?","Қай әрекет бірінші басталды?"],
u8c03:["Схема","Сызба"],
u8c04:["ФОРМА. was / were + глагол + -ing. Отрицание — wasn't / weren't, вопрос — перестановка.","ФОРМА. was / were + етістік + -ing. Болымсызы — wasn't / weren't, сұрағы — орын ауыстыру."],
u8c05:["УПОТРЕБЛЕНИЕ. Past Continuous задаёт фон. Past Simple — то, что произошло.","ҚОЛДАНЫЛУЫ. Past Continuous аясын береді. Past Simple — болған оқиға."],
u8c06:["WHILE идёт с длинным действием, WHEN — с коротким.","WHILE ұзақ әрекетпен, WHEN қысқа әрекетпен келеді."],
u8c07:["Нельзя: «I was read», «While the lift stopped», «I was knowing».","Болмайды: «I was read», «While the lift stopped», «I was knowing»."],
u8c08:["В уроке 9 оба времени встретятся внутри одной истории.","9-сабақта екі шақ бір әңгіме ішінде кездеседі."],
u8c09:["Пять вопросов из записи учебника.","Оқулық жазбасынан бес сұрақ."],
u8d04:["ФОРМА. was или were плюс глагол с -ing. Краткие ответы повторяют только was / were.","ФОРМА. was немесе were плюс -ing етістігі. Қысқа жауап тек was / were қайталайды."],
u8d05:["ЗНАЧЕНИЕ. Past Continuous — камера, наведённая на середину действия. Past Simple — точка: то, что случилось.","МАҒЫНАСЫ. Past Continuous — әрекеттің ортасына бағытталған камера. Past Simple — нүкте: болған оқиға."],
u8d06:["WHILE вводит длинное действие, WHEN — короткое. Если придаточное впереди, ставится запятая.","WHILE ұзақ әрекетті, WHEN қысқа әрекетті енгізеді. Бағыныңқы алда тұрса, үтір қойылады."],
u8d07:["ДВА ДЛИННЫХ ДЕЙСТВИЯ — Past Continuous дважды. Два коротких подряд — Past Simple дважды.","ЕКІ ҰЗАҚ ӘРЕКЕТ — Past Continuous екі рет. Екі қысқа әрекет — Past Simple екі рет."],
u8d08:["ГЛАГОЛЫ СОСТОЯНИЯ — know, like, want, need — обычно без -ing.","КҮЙ ЕТІСТІКТЕРІ — know, like, want, need — әдетте -ing-сіз."],
u8d09:["Четыре типичные ошибки: «I was read», «While the lift stopped», «I was knowing», «They was talking».","Төрт кең тараған қате: «I was read», «While the lift stopped», «I was knowing», «They was talking»."],
u8d10:["Past Simple из урока 7 присутствует в каждом задании.","7-сабақтағы Past Simple әр тапсырмада бар."],
u8e01:["1 · was или were?","1 · was па, were ме?"],
u8e02:["2 · Напишите форму -ing.","2 · -ing формасын жазыңыз."],
u8e03:["3 · Какое время? Выберите нужную форму.","3 · Қай шақ? Керекті форманы таңдаңыз."],
u8e04:["4 · while или when?","4 · while ма, when бе?"],
u8e05:["while идёт с длинным действием, when — с коротким.","while ұзақ әрекетпен, when қысқа әрекетпен."],
u8e06:["5 · Расставьте слова по порядку.","5 · Сөздерді ретімен қойыңыз."],
u8e07:["6 · Найдите ошибку. Нажмите на неверное слово.","6 · Қатені табыңыз. Қате сөзді басыңыз."],
u8e08:["7 · повторение · Дополните историю. Выберите Past Simple или Past Continuous.","7 · қайталау · Әңгімені толықтырыңыз. Past Simple не Past Continuous таңдаңыз."],
u8e09:["8 · Дополните диалог.","8 · Диалогты толықтырыңыз."],
u8f01:["Перед прослушиванием: двое незнакомцев заходят в пустой лифт. Где они встанут?","Тыңдау алдында: екі бейтаныс бос лифтке кірді. Олар қайда тұрады?"],
u8f02:["Это предположение. Часть 1 даст ответ.","Бұл болжам. 1-бөлім жауабын береді."],
u8f03:["1 · Послушайте часть 1. Сколько людей и какая фигура?","1 · 1-бөлімді тыңдаңыз. Қанша адам, қандай пішін?"],
u8f04:["2 · Послушайте часть 2. Верно или неверно?","2 · 2-бөлімді тыңдаңыз. Дұрыс па, бұрыс па?"],
u8f05:["3 · Почему мы так себя ведём? Послушайте часть 2 ещё раз.","3 · Неге біз осылай әрекет етеміз? 2-бөлімді қайта тыңдаңыз."],
u8f06:["4 · Послушайте и ответьте о себе.","4 · Тыңдап, өзіңіз туралы жауап беріңіз."],
u8f07:["Пять вопросов. В каждом — грамматика этапа 3.","Бес сұрақ. Әрқайсысында 3-кезеңнің грамматикасы."],
u8f08:["Запишите ответы","Жауаптарыңызды жазыңыз"],
u8f09:["Обсудите","Талқылаңыз"],
u8g01:["Послушайте правило.","Ережені тыңдаңыз."],
u8g02:["Послушайте двенадцать фраз. Исчезает ли -t или -d?","Он екі тіркесті тыңдаңыз. -t не -d жоғала ма?"],
u8g03:["Только распознавание — повторять не нужно.","Тек тану — қайталаудың қажеті жоқ."],
u8g04:["Преподавателю","Мұғалімге"],
u8h01:["Работайте в парах. Выберите карточку и расскажите, что произошло.","Жұппен жұмыс істеңіз. Картаны таңдап, не болғанын айтыңыз."],
u8h02:["Выберите карточку и напишите, что произошло.","Картаны таңдап, не болғанын жазыңыз."],
u8h03:["Напишите","Жазыңыз"],u8h04:["Преподавателю","Мұғалімге"],
u8i01:["Отметьте всё, что вы теперь умеете.","Енді қолыңыздан келетіннің бәрін белгілеңіз."],
u8i02:["Преподавателю","Мұғалімге"],
u9a01:["Расставьте пять событий в том порядке, в каком они обычно происходят в поездке.","Бес оқиғаны сапарда әдетте болатын ретімен қойыңыз."],
u9a02:["Нажимайте по порядку. Нажмите ещё раз, чтобы вернуть.","Ретімен басыңыз. Қайтару үшін қайта басыңыз."],
u9a03:["Запишите","Жазып қойыңыз"],u9a04:["Обсудите","Талқылаңыз"],
u9b01:["Прочитайте слова. Нажмите на карточку — увидите пример и сочетания. Динамик — произношение.","Сөздерді оқыңыз. Картаны бассаңыз — мысал мен тіркестер. Динамик — айтылуы."],
u9b02:["Показать перевод","Аудармасын көрсету"],
u9b03:["1 · Соотнесите каждое слово с его значением.","1 · Әр сөзді мағынасымен сәйкестендіріңіз."],
u9b04:["3 · Глагол + -er = человек, который это делает. Образуйте слово.","3 · Етістік + -er = осыны істейтін адам. Сөзді жасаңыз."],
u9b05:["Следите за написанием: короткий глагол удваивает последнюю букву, глагол на -e добавляет только -r.","Жазылуын қадағалаңыз: қысқа етістік соңғы әріпті екі етеді, -e-ге аяқталса тек -r."],
u9b06:["4 · Дополните предложения.","4 · Сөйлемдерді толықтырыңыз."],
u9c01:["Прочитайте начало одной из сегодняшних историй.","Бүгінгі әңгімелердің бірінің басын оқыңыз."],
u9c02:["Какое время задаёт обстановку, а какое двигает историю?","Қай шақ жағдайды сипаттайды, қайсысы әңгімені жылжытады?"],
u9c03:["Структура устного рассказа","Ауызша әңгіменің құрылымы"],
u9c04:["ДВА ВРЕМЕНИ. Past Continuous — фон, Past Simple — событие.","ЕКІ ШАҚ. Past Continuous — ая, Past Simple — оқиға."],
u9c05:["ЗАЧИНЫ И СВЯЗКИ. You'll never believe начинает, So anyway двигает, In the end закрывает.","БАСТАУ МЕН БАЙЛАНЫС. You'll never believe бастайды, So anyway жылжытады, In the end аяқтайды."],
u9c06:["РЕАКЦИИ. Короткие, быстрые и частые. Слушатель — половина разговора.","РЕАКЦИЯЛАР. Қысқа, жылдам, жиі. Тыңдаушы — әңгіменің жартысы."],
u9c07:["История целиком в Past Simple звучит как список. Сначала задайте обстановку.","Толығымен Past Simple-мен айтылған әңгіме тізімге ұқсайды. Алдымен жағдайды сипаттаңыз."],
u9c08:["После этого урока — итоговый тест по Unit 3.","Осы сабақтан кейін — 3-бөлім бойынша қорытынды тест."],
u9c09:["Пять фраз из записи учебника.","Оқулық жазбасынан бес тіркес."],
u9d04:["ДВА ВРЕМЕНИ ВМЕСТЕ. Ничего нового: Past Continuous рисует фон, Past Simple подаёт события одно за другим.","ЕКІ ШАҚ БІРГЕ. Жаңалық жоқ: Past Continuous аясын салады, Past Simple оқиғаларды бірінен соң бірін береді."],
u9d05:["ЗАЧИН. Носители предупреждают, что сейчас будет история. Без зачина слушатель не знает, что пора слушать.","БАСТАУ. Ағылшын тілінде әңгіме келе жатқанын алдын ала ескертеді. Онсыз тыңдаушы дайын болмайды."],
u9d06:["ДВИЖЕНИЕ. So, anyway — главная связка: «фон закончился, вот суть». In the end закрывает.","ЖЫЛЖУ. So, anyway — негізгі байланыс: «ая бітті, енді мәні». In the end аяқтайды."],
u9d07:["РЕАКЦИИ. Именно эту половину пропускают, и именно она делает разговор живым. Нужно около шести фраз.","РЕАКЦИЯЛАР. Дәл осы жартысы қалып қояды, ал ол әңгімені тірі етеді. Алты тіркес жеткілікті."],
u9d08:["В ПИСЬМЕ. Та же структура плюс Dear…, Guess what, Anyway, Write back soon.","ХАТТА. Дәл сол құрылым және Dear…, Guess what, Anyway, Write back soon."],
u9d09:["Избегайте двух вещей: рассказа целиком в Past Simple и молчащего слушателя.","Екі нәрседен аулақ болыңыз: тек Past Simple-мен айтылған әңгіме және үнсіз тыңдаушы."],
u9d10:["Это последний урок Unit 3. Тест охватывает оба прошедших времени и наречия образа действия.","Бұл — 3-бөлімнің соңғы сабағы. Тест екі өткен шақты және іс-қимыл үстеулерін қамтиды."],
u9e01:["1 · Послушайте девять фраз. Что делает каждая?","1 · Тоғыз тіркесті тыңдаңыз. Әрқайсысы не істейді?"],
u9e02:["Аудио 3.15","3.15 аудиосы"],
u9e03:["2 · повторение · Выберите время, которое нужно истории.","2 · қайталау · Әңгімеге керек шақты таңдаңыз."],
u9e04:["3 · Что бы вы сказали? Выберите естественную реакцию.","3 · Не айтар едіңіз? Табиғи реакцияны таңдаңыз."],
u9e05:["4 · Дополните диалог одним словом в каждом пропуске.","4 · Диалогты әр бос орынға бір сөзбен толықтырыңыз."],
u9e06:["5 · Расставьте историю по порядку.","5 · Әңгімені ретімен қойыңыз."],
u9e07:["6 · Найдите ошибку. Нажмите на неверное слово.","6 · Қатені табыңыз. Қате сөзді басыңыз."],
u9f01:["Перед прослушиванием: у обоих был неприятный момент на людях. Что, по-вашему, произошло?","Тыңдау алдында: екеуінің де көпшілік алдында жағымсыз сәті болған. Не болды деп ойлайсыз?"],
u9f02:["Выбирайте сколько хотите. Сейчас проверим.","Қалағаныңызша таңдаңыз. Қазір тексереміз."],
u9f03:["1 · Послушайте обе истории. Чья это история?","1 · Екі әңгімені де тыңдаңыз. Бұл кімнің әңгімесі?"],
u9f04:["2 · Послушайте ещё раз и впишите детали.","2 · Қайта тыңдап, толық ақпаратты жазыңыз."],
u9f05:["3 · Послушайте разговор. Расставьте события по порядку.","3 · Әңгімені тыңдаңыз. Оқиғаларды ретімен қойыңыз."],
u9f06:["4 · Послушайте ещё раз. Какие реакции использует говорящий B?","4 · Қайта тыңдаңыз. B сөйлеуші қандай реакцияларды қолданады?"],
u9f07:["B говорит пять раз за пятьдесят секунд. Это нормально.","B елу секундта бес рет сөйлейді. Бұл қалыпты жағдай."],
u9f08:["Обсудите","Талқылаңыз"],
u9g01:["Прочитайте письмо целиком. Пока ничего не делайте.","Хатты толық оқыңыз. Әзірге ештеңе істемеңіз."],
u9g02:["1 · Какая часть письма выполняет какую задачу?","1 · Хаттың қай бөлігі қандай қызмет атқарады?"],
u9g03:["2 · Найдите два предложения, где оба прошедших времени стоят вместе.","2 · Екі өткен шақ қатар тұрған екі сөйлемді табыңыз."],
u9g04:["3 · Формально или неформально? В таком письме используется неформальный вариант.","3 · Ресми ме, бейресми ме? Мұндай хатта бейресми нұсқа қолданылады."],
u9h01:["Работайте в парах. Выберите карточку, расскажите историю, затем поменяйтесь ролями.","Жұппен жұмыс істеңіз. Картаны таңдап, әңгімені айтыңыз, содан кейін рөл ауыстырыңыз."],
u9h02:["Выберите карточку и продумайте историю, которую напишете.","Картаны таңдап, жазатын әңгімеңізді ойластырыңыз."],
u9h03:["Теперь напишите письмо.","Енді хат жазыңыз."],
u9h04:["Напишите","Жазыңыз"],u9h05:["Преподавателю","Мұғалімге"],
u9i01:["Отметьте всё, что вы теперь умеете.","Енді қолыңыздан келетіннің бәрін белгілеңіз."],
u9i02:["Преподавателю","Мұғалімге"],
z101:["Сохраните оба поля. На последнем этапе вы сами сверите их со списком «Теперь вы умеете…» и увидите, какие этапы ещё нужно доработать.","Екі өрісті де сақтаңыз. Соңғы кезеңде оларды «Енді сіз істей аласыз…» тізімімен өзіңіз салыстырып, қай кезеңдерді әлі пысықтау керегін көресіз."],
z102:["Сохраните текст. Перечитайте свой пост ещё раз по четырём вопросам выше, прежде чем идти дальше — при повторном чтении своего текста находится больше, чем кажется.","Мәтінді сақтаңыз. Әрі қарай жүрер алдында жазбаңызды жоғарыдағы төрт сұрақ бойынша тағы бір оқып шығыңыз — өз мәтініңізді қайта оқығанда ойлағаннан көп нәрсе табылады."],
z103:["Используйте <i>How often…?</i> минимум дважды. Сохраните их — это те вопросы, которые вы задали бы на самом деле.","<i>How often…?</i> кемінде екі рет қолданыңыз. Оларды сақтап қойыңыз — бұл шын мәнінде қоятын сұрақтарыңыз."],
x101:["К какому времени года вы действительно ждёте? Выберите одно.","Қай мезгілді шынымен асыға күтесіз? Біреуін таңдаңыз."],
x102:["Затем выберите то, которое нравится меньше всего. Правильного ответа нет — люди спорят об этом круглый год.","Содан кейін ең ұнамайтынын таңдаңыз. Дұрыс жауап жоқ — бұл туралы жыл бойы таласады."],
x103:["Запомните оба ответа. Скоро для каждого понадобится причина.","Екі жауабыңызды да есте сақтаңыз. Жақында әрқайсысына себеп керек болады."],
x104:["Запишите","Жазып алыңыз"],
x105:["Почему? Напишите по одному предложению о каждом выбранном сезоне. О грамматике пока не думайте — для этого и есть урок.","Неге? Таңдаған әр мезгіл туралы бір сөйлемнен жазыңыз. Грамматика туралы әзірге ойламаңыз — сабақ соған арналған."],
x106:["Узнайте","Біліңіз"],
x107:["Спросите трёх человек, какое время года они выбрали. Найдите того, кто не согласен с вами, и спросите почему.","Үш адамнан қай мезгілді таңдағанын сұраңыз. Сізбен келіспейтін біреуін тауып, себебін сұраңыз."],
x108:["Расскажите об одном ответе: <i>Aigerim looks forward to winter, but I don't.</i>","Бір жауапты айтып беріңіз: <i>Aigerim looks forward to winter, but I don't.</i>"],
x109:["Спросите преподавателя, какое время года он выбрал и почему. Затем ответьте на тот же вопрос сами.","Мұғалімнен қай мезгілді таңдағанын және неге екенін сұраңыз. Содан кейін сол сұраққа өзіңіз жауап беріңіз."],
x110:["Найдите одно время года, в котором вы сходитесь, и одно, в котором нет.","Пікірлеріңіз сәйкес келетін бір мезгілді және сәйкес келмейтін бір мезгілді табыңыз."],
x201:["3 · Соедините каждое слово с его значением.","3 · Әр сөзді өз мағынасымен сәйкестендіріңіз."],
x202:["4 · Турист обрадуется или огорчится, услышав это? Разберите погоду.","4 · Турист мұны естігенде қуана ма, әлде ренжи ме? Ауа райын сұрыптаңыз."],
x203:["Думайте о том, каково быть на улице в такую погоду, а не о пользе для урожая.","Мұндай ауа райында далада болу қандай екенін ойлаңыз, егінге пайдасын емес."],
x204:["5 · Какое слово с каким сочетается? Выберите естественную пару.","5 · Қай сөз қайсысымен тіркеседі? Табиғи жұбын таңдаңыз."],
x205:["6 · Работайте в парах. Опишите месяц, не называя его.","6 · Жұпта жұмыс істеңіз. Айды атамай сипаттаңыз."],
x206:["Студент A описывает месяц в вашей стране, используя три слова из списка. Студент B угадывает месяц. Затем поменяйтесь. По три раза каждый. Отметьте выполненным, когда закончите оба.","A студенті тізімдегі үш сөзді қолданып, еліңіздегі бір айды сипаттайды. B студенті айды табады. Содан кейін ауысыңыз. Әрқайсысы үш реттен. Екеуің де аяқтағанда орындалды деп белгілеңіз."],
x207:["Нельзя называть месяц, время года или праздник. Только погода.","Айды, мезгілді немесе мерекені атауға болмайды. Тек ауа райы."],
x208:["6 · Опишите месяц, не называя его.","6 · Айды атамай сипаттаңыз."],
x209:["Опишите месяц в вашей стране тремя словами из списка. Преподаватель угадывает. Затем преподаватель описывает месяц в другой стране, а угадываете вы. По три раза.","Тізімдегі үш сөзбен еліңіздегі айды сипаттаңыз. Мұғалім табады. Содан кейін мұғалім басқа елдегі айды сипаттайды, ал сіз табасыз. Үш реттен."],
x210:["Преподавателю: если описание слишком расплывчатое, задайте один вопрос, а не угадывайте наугад.","Мұғалімге: сипаттама тым бұлыңғыр болса, кездейсоқ болжамай, бір сұрақ қойыңыз."],
x211:["7 · Дополните прогноз погоды.","7 · Ауа райы болжамын толықтырыңыз."],
x301:["Прочитайте эти четыре предложения. Все они звучат в записи далее в этом уроке.","Мына төрт сөйлемді оқыңыз. Олардың бәрі осы сабақтағы жазбада естіледі."],
x302:["В какой форме стоит глагол после всех этих выражений?","Осы тіркестердің бәрінен кейін етістік қандай тұлғада тұр?"],
x303:["Конструкции","Құрылымдар"],
x304:["Теперь расставьте шесть выражений по порядку — от «обожаю» до «терпеть не могу».","Енді алты тіркесті «жақсы көремін» дегеннен «шыдай алмаймын» дегенге дейін ретімен қойыңыз."],
x305:["ФОРМА. После <b>love, like, enjoy, don't mind, can't stand</b> используйте форму на <b>-ing</b>: <i>I enjoy walking</i>. Никогда <i>I enjoy to walk</i>.","ТҰЛҒАСЫ. <b>love, like, enjoy, don't mind, can't stand</b> сөздерінен кейін <b>-ing</b> тұлғасы қолданылады: <i>I enjoy walking</i>. <i>I enjoy to walk</i> ешқашан болмайды."],
x306:["ПРЕДЛОГИ ЗАСТАВЛЯЮТ. <b>keen on</b>, <b>interested in</b>, <b>into</b>, <b>good at</b> — после любого из этих коротких слов глагол обязан быть на <b>-ing</b>: <i>keen on swimming</i>.","ДЕМЕУЛІКТЕР МІНДЕТТЕЙДІ. <b>keen on</b>, <b>interested in</b>, <b>into</b>, <b>good at</b> — осы қысқа сөздердің кез келгенінен кейін етістік міндетті түрде <b>-ing</b> тұлғасында болады: <i>keen on swimming</i>."],
x307:["СУЩЕСТВИТЕЛЬНОЕ ТОЖЕ ПОДХОДИТ. <i>I can't stand crowds. I don't mind the cold.</i> Форма на <i>-ing</i> нужна только тогда, когда речь о действии.","ЗАТ ЕСІМ ДЕ КЕЛЕДІ. <i>I can't stand crowds. I don't mind the cold.</i> <i>-ing</i> тұлғасы тек әрекет туралы айтқанда керек."],
x308:["Нельзя: «I enjoy to swim», «I'm interested in photograph», «I prefer spring than summer».","Былай болмайды: «I enjoy to swim», «I'm interested in photograph», «I prefer spring than summer»."],
x309:["СИЛА. love → really like → quite like → don't mind → not keen on → can't stand. <i>Don't mind</i> — это не восторг, а согласие мириться.","КҮШІ. love → really like → quite like → don't mind → not keen on → can't stand. <i>Don't mind</i> — бұл қуану емес, көне салу."],
y305:["ФОРМА. После <b>love, like, enjoy, don't mind, can't stand</b> глагол принимает форму на <b>-ing</b>: <i>I enjoy walking, I can't stand waiting</i>. Это самое полезное правило урока, потому что <i>I enjoy to swim</i> — одна из самых частых ошибок на этом уровне, и она всегда звучит неправильно. Написание: <i>swim → swimming</i> (удваиваем согласную), <i>make → making</i> (убираем <i>e</i>).","ТҰЛҒАСЫ. <b>love, like, enjoy, don't mind, can't stand</b> сөздерінен кейін етістік <b>-ing</b> тұлғасын алады: <i>I enjoy walking, I can't stand waiting</i>. Бұл — сабақтың ең пайдалы ережесі, өйткені <i>I enjoy to swim</i> осы деңгейдегі ең жиі қателердің бірі әрі әрдайым қате естіледі. Жазылуы: <i>swim → swimming</i> (дауыссыз қосарланады), <i>make → making</i> (<i>e</i> түсіп қалады)."],
y306:["ПРЕДЛОГИ ТРЕБУЮТ ФОРМЫ НА -ING. <b>keen on</b>, <b>interested in</b>, <b>into</b>, <b>good at</b>, <b>tired of</b> — если один из этих коротких слов стоит перед глаголом, глагол обязан оканчиваться на <b>-ing</b>. Исключений нет: <i>I'm interested in learning</i>, но никогда <i>interested in learn</i> или <i>interested in to learn</i>. Если запомнить только одно правило, запомните это: предлоги встречаются повсюду.","ДЕМЕУЛІКТЕР -ING ТҰЛҒАСЫН ТАЛАП ЕТЕДІ. <b>keen on</b>, <b>interested in</b>, <b>into</b>, <b>good at</b>, <b>tired of</b> — осы қысқа сөздердің бірі етістіктің алдында тұрса, етістік міндетті түрде <b>-ing</b>-ке аяқталады. Ерекшелік жоқ: <i>I'm interested in learning</i>, бірақ ешқашан <i>interested in learn</i> немесе <i>interested in to learn</i> емес. Бір ғана ережені есте сақтасаңыз, осыны сақтаңыз: демеуліктер барлық жерде кездеседі."],
y307:["СУЩЕСТВИТЕЛЬНОЕ РАБОТАЕТ НЕ ХУЖЕ. Глагол нужен не всегда: <i>I can't stand crowds. I don't mind the cold. I'm keen on photography.</i> Используйте <i>-ing</i> только тогда, когда то, что вам нравится или не нравится, — это <b>действие</b>. Если это предмет, место или погода, обычное существительное правильнее и звучит естественнее.","ЗАТ ЕСІМ ДЕ ДӘЛ СОНДАЙ ЖҰМЫС ІСТЕЙДІ. Етістік әрдайым қажет емес: <i>I can't stand crowds. I don't mind the cold. I'm keen on photography.</i> <i>-ing</i> тұлғасын ұнататын не ұнатпайтын нәрсеңіз <b>әрекет</b> болғанда ғана қолданыңыз. Егер ол зат, орын немесе ауа райы болса, кәдімгі зат есім дұрысырақ әрі табиғи естіледі."],
y308:["Три ошибки, за которыми стоит следить: «I enjoy to swim» (неверная форма) · «I'm interested in photograph» (неверная часть речи — нужно существительное <i>photography</i> или форма на <i>-ing</i>) · «I prefer spring than summer» (правильно <i>prefer X <b>to</b> Y</i>).","Назар аударатын үш қате: «I enjoy to swim» (қате тұлға) · «I'm interested in photograph» (қате сөз табы — <i>photography</i> зат есімі немесе <i>-ing</i> тұлғасы керек) · «I prefer spring than summer» (дұрысы <i>prefer X <b>to</b> Y</i>)."],
y309:["СИЛА ВАЖНА НЕ МЕНЬШЕ ФОРМЫ. love → really like → quite like → don't mind → not keen on → can't stand. Два выражения сбивают с толку: <i>don't mind</i> звучит положительно, но означает лишь согласие мириться, а <i>not keen on</i> — вежливый способ сказать, что вам не нравится. Носители используют оба, чтобы не показаться грубыми.","КҮШІ ТҰЛҒАДАН КЕМ ЕМЕС. love → really like → quite like → don't mind → not keen on → can't stand. Екі тіркес шатастырады: <i>don't mind</i> оң естіледі, бірақ тек көне салуды білдіреді, ал <i>not keen on</i> — ұнатпайтыныңды сыпайы айту тәсілі. Ана тілінде сөйлейтіндер дөрекі көрінбеу үшін екеуін де қолданады."],
x310:["Пять настоящих предложений из аудиозаписи учебника.","Оқулық жазбасынан алынған бес нақты сөйлем."],
x401:["1 · Выберите правильную форму.","1 · Дұрыс тұлғаны таңдаңыз."],
x402:["2 · В каждом предложении одно слово лишнее или неверное. Нажмите на него.","2 · Әр сөйлемде бір сөз артық немесе қате. Соны басыңыз."],
x403:["Сначала прочитайте предложение целиком, потом нажмите на единственное слово, которого там быть не должно.","Алдымен сөйлемді толық оқыңыз, содан кейін ол жерде болмауы керек жалғыз сөзді басыңыз."],
x404:["3 · Напечатайте пропущенное короткое слово.","3 · Түсіп қалған қысқа сөзді теріңіз."],
x405:["Именно эти слова требуют формы на <i>-ing</i>. Выучить их — половина дела.","Дәл осы сөздер <i>-ing</i> тұлғасын талап етеді. Оларды үйрену — істің жартысы."],
x406:["4 · Составьте предложение. Нажимайте на слова в правильном порядке.","4 · Сөйлем құрастырыңыз. Сөздерді дұрыс ретпен басыңыз."],
x407:["5 · Насколько сильно? Соедините фразу с тем, что человек на самом деле имеет в виду.","5 · Қаншалықты күшті? Тіркесті адамның шын мәнінде айтқысы келгенімен сәйкестендіріңіз."],
x408:["6 · Согласитесь или не согласитесь. Работайте в парах.","6 · Келісіңіз немесе келіспеңіз. Жұпта жұмыс істеңіз."],
x409:["Студент A высказывает мнение о погоде или временах года. Студент B должен ответить <b>другим</b> выражением со шкалы — повторять то, что уже использовал партнёр, нельзя. Продолжайте, пока у кого-то не закончатся выражения.","A студенті ауа райы немесе мезгілдер туралы пікір айтады. B студенті шкаладағы <b>басқа</b> тіркеспен жауап беруі керек — жұбы қолданғанын қайталауға болмайды. Біреуінің тіркесі таусылғанша жалғастырыңыз."],
x410:["На шкале шесть выражений, значит цель — по шесть ходов каждому. Запишите те, которые партнёр так и не использовал.","Шкалада алты тіркес бар, демек мақсат — әрқайсысына алты жүрістен. Жұбыңыз қолданбаған тіркестерді жазып алыңыз."],
x411:["6 · Согласитесь или не согласитесь, с преподавателем.","6 · Мұғаліммен келісіңіз немесе келіспеңіз."],
x412:["Вы высказываете мнение о погоде или временах года. Преподаватель отвечает другим выражением со шкалы, затем добавляет своё. Повторять выражения нельзя ни вам, ни ему.","Сіз ауа райы немесе мезгілдер туралы пікір айтасыз. Мұғалім шкаладағы басқа тіркеспен жауап беріп, өз пікірін қосады. Тіркестерді қайталауға екеуіңізге де болмайды."],
x413:["Преподавателю: добивайтесь слабых выражений. Студенты хватаются за <i>love</i> и <i>hate</i> и избегают <i>don't mind</i> и <i>not keen on</i>.","Мұғалімге: әлсіз тіркестерді талап етіңіз. Студенттер <i>love</i> мен <i>hate</i> сөздерін ұстап алып, <i>don't mind</i> пен <i>not keen on</i> тіркестерінен қашады."],
x414:["7 · Перепишите так, чтобы смысл не изменился. Напечатайте пропущенные слова.","7 · Мағынасы өзгермейтіндей етіп қайта жазыңыз. Түсіп қалған сөздерді теріңіз."],
x415:["8 · Правописание. Напишите форму на <i>-ing</i>.","8 · Емле. <i>-ing</i> тұлғасын жазыңыз."],
x501:["Перед чтением: человек из Японии отвечает на вопрос <i>когда мне приехать?</i>","Оқу алдында: Жапониядан бір адам <i>қашан келейін?</i> деген сұраққа жауап беріп отыр."],
x502:["Какое время года он посоветует туристам избегать? Выберите одно, затем прочитайте и проверьте.","Ол туристерге қай мезгілден аулақ болуға кеңес береді деп ойлайсыз? Біреуін таңдап, оқып тексеріңіз."],
x503:["Пока правильного ответа нет. Это ваше предположение.","Әзірге дұрыс жауап жоқ. Бұл — сіздің болжамыңыз."],
x504:["1 · Прочитайте один раз. Какой ответ автор даёт на самом деле?","1 · Бір рет оқыңыз. Автор шын мәнінде қандай жауап береді?"],
x505:["2 · Прочитайте ещё раз ради фактов. Ответьте числом или одним словом.","2 · Фактілер үшін қайта оқыңыз. Санмен немесе бір сөзбен жауап беріңіз."],
x506:["Теперь изучите образец","Енді үлгіні зерттеңіз"],
x507:["Следующие три задания — не о том, <i>что</i> написано в посте. Они о том, <b>как он построен</b>, потому что вы будете строить точно такой же.","Келесі үш тапсырма посттың <i>не</i> айтқаны туралы емес. Олар оның <b>қалай құрылғаны</b> туралы, өйткені сіз дәл сондай пост жазасыз."],
x508:["3 · СТРУКТУРА. Какую задачу выполняет каждая часть поста? Расставьте их в том порядке, в котором они идут.","3 · ҚҰРЫЛЫМЫ. Посттың әр бөлігі қандай қызмет атқарады? Оларды кездесу ретімен қойыңыз."],
x509:["4 · ПОЛЕЗНЫЕ ФРАЗЫ. Найдите в посте фразу для каждой задачи. Напечатайте её.","4 · ПАЙДАЛЫ ТІРКЕСТЕР. Әр қызметке сай тіркесті посттан табыңыз. Оны теріңіз."],
x510:["Скопируйте точно так, как в тексте. Эти фразы вы используете в своём посте.","Мәтіндегідей дәл көшіріңіз. Бұл тіркестерді өз постыңызда қолданасыз."],
x511:["5 · СТИЛЬ. Это пост в интернете, а не отчёт. Какой вариант сюда подходит?","5 · СТИЛІ. Бұл — интернеттегі жазба, есеп емес. Қай нұсқа мұнда келеді?"],
x512:["Оба варианта — правильный английский. Но только один звучит как человек, отвечающий на вопрос онлайн.","Екі нұсқа да дұрыс ағылшын тілі. Бірақ біреуі ғана онлайн сұраққа жауап беріп отырған адамдай естіледі."],
x513:["6 · Найдите в посте слово со значением…","6 · Посттан мына мағынадағы сөзді табыңыз…"],
x514:["7 · Автор высказывает шесть мнений. Выпишите выражение из каждого.","7 · Автор алты пікір білдіреді. Әрқайсысынан тіркесті жазып алыңыз."],
x515:["8 · Подошёл бы такой пост для вашей страны?","8 · Мұндай жазба сіздің еліңізге келер ме еді?"],
x516:["В каждом ответе используйте выражение мнения: <i>I can't stand…</i>, <i>I don't mind…</i>, <i>I'm not keen on…</i>","Әр жауапта пікір тіркесін қолданыңыз: <i>I can't stand…</i>, <i>I don't mind…</i>, <i>I'm not keen on…</i>"],
x601:["Перед прослушиванием: Файсал живёт в Дубае, Марек в Альберте, Джина в Рио-де-Жанейро.","Тыңдау алдында: Файсал Дубайда, Марек Альбертада, Джина Рио-де-Жанейрода тұрады."],
x602:["Угадайте любимое время года каждого, прежде чем включать запись. Догадка заставляет вслушиваться в ответ.","Жазбаны қоспас бұрын әрқайсысының сүйікті мезгілін болжаңыз. Болжам жауапты тыңдауға мәжбүрлейді."],
x603:["1 · Послушайте один раз. Какое время года выбирает каждый?","1 · Бір рет тыңдаңыз. Әрқайсысы қай мезгілді таңдайды?"],
x604:["Нажмите на имя, чтобы прослушать только этого человека.","Тек сол адамды тыңдау үшін есімін басыңыз."],
x605:["2 · Послушайте ещё раз ради причин. Ответьте одним-двумя словами.","2 · Себептері үшін қайта тыңдаңыз. Бір-екі сөзбен жауап беріңіз."],
x606:["3 · Верно или неверно? Два утверждения ошибочны.","3 · Дұрыс па, бұрыс па? Екі тұжырым қате."],
x607:["4 · Девять отдельных предложений. Включайте каждое и записывайте выражение, которое слышите.","4 · Тоғыз жеке сөйлем. Әрқайсысын қосып, естіген тіркесіңізді жазыңыз."],
x608:["Это те же предложения, что были в грамматике, плюс ещё четыре. Пишите ровно то, что говорит диктор.","Бұл — грамматикада болған сөйлемдер, тағы төртеуі қосылған. Сөйлеушінің дәл айтқанын жазыңыз."],
x609:["Теперь используйте это","Енді мұны қолданыңыз"],
x701:["Ваш план — те же четыре части","Сіздің жоспарыңыз — сол төрт бөлік"],
x702:["<b>Заголовок.</b> Вопрос, который турист задал бы на самом деле.","<b>Тақырып.</b> Турист шын мәнінде қоятын сұрақ."],
x703:["<b>Одна строка</b> о том, почему вы отвечаете.","Неге жауап беріп отырғаныңыз туралы <b>бір жол</b>."],
x704:["<b>По одному короткому абзацу на время года.</b> Мнение, причина и одно предупреждение.","<b>Әр мезгілге бір қысқа абзацтан.</b> Пікір, себеп және бір ескерту."],
x705:["<b>Одна ясная рекомендация</b> в конце.","Соңында <b>бір анық ұсыныс</b>."],
x706:["Банк фраз — используйте минимум шесть","Тіркестер банкі — кемінде алтауын қолданыңыз"],
x707:["1 · Напишите свой пост. Около 200 слов, четыре времени года, четыре абзаца.","1 · Өз жазбаңызды жазыңыз. Шамамен 200 сөз, төрт мезгіл, төрт абзац."],
x708:["Используйте минимум шесть фраз из банка и минимум восемь слов о погоде из этого урока.","Банктен кемінде алты тіркесті және осы сабақтағы ауа райы туралы кемінде сегіз сөзді қолданыңыз."],
x709:["2 · Проверьте свой черновик, прежде чем отправлять.","2 · Жіберер алдында өз нұсқаңызды тексеріңіз."],
x711:["1 · Составьте план в парах, затем пишите поодиночке.","1 · Жоспарды жұпта құрыңыз, содан кейін жеке жазыңыз."],
x712:["Пять минут вместе: договоритесь о четырёх временах года и одном мнении на каждое. Затем пишите свой пост отдельно — план общий, слова ваши.","Бірге бес минут: төрт мезгіл және әрқайсысына бір пікір туралы келісіңіз. Содан кейін өз жазбаңызды жеке жазыңыз — жоспар ортақ, сөздер сіздікі."],
x713:["2 · Обменяйтесь постами и прочитайте как редактор, а не как друг.","2 · Жазбаларыңызды алмасып, дос емес, редактор ретінде оқыңыз."],
x714:["Прочитайте пост партнёра и ответьте на три вопроса о нём. Грамматику не исправляйте — это работа преподавателя в конце.","Жұбыңыздың жазбасын оқып, ол туралы үш сұраққа жауап беріңіз. Грамматиканы түзетпеңіз — бұл соңында мұғалімнің жұмысы."],
x715:["Соберите посты в конце, а не во время работы. Обратная связь откладывается, как принято в уроке-образце: по две строки каждому — одно удачное выражение и одна форма для исправления.","Жазбаларды жұмыс кезінде емес, соңында жинаңыз. Кері байланыс үлгі-сабақтағыдай кейінге қалдырылады: әрқайсысына екі жолдан — бір сәтті тіркес және түзететін бір тұлға."],
x716:["1 · Составьте план с преподавателем, затем напишите.","1 · Мұғаліммен жоспар құрыңыз, содан кейін жазыңыз."],
x717:["Пять минут обсуждения: договоритесь об одном мнении на каждое время года. Преподаватель задаёт вопросы, решения принимаете вы.","Бес минут талқылау: әр мезгілге бір пікір туралы келісіңіз. Мұғалім сұрақ қояды, шешімді сіз қабылдайсыз."],
x718:["2 · Прочитайте готовый пост преподавателю вслух.","2 · Дайын жазбаны мұғалімге дауыстап оқыңыз."],
x719:["Чтение вслух ловит больше ошибок, чем чтение про себя. Преподаватель слушает, не перебивая.","Дауыстап оқу іштей оқығаннан көп қатені байқатады. Мұғалім бөлмей тыңдайды."],
x720:["Не перебивайте чтение. Отметьте ошибки, затем дайте ровно две строки в конце: одно удачное выражение и одна форма для исправления.","Оқуды бөлмеңіз. Қателерді белгілеп, соңында дәл екі жол айтыңыз: бір сәтті тіркес және түзететін бір тұлға."],
x721:["Завершите чеклистом. Скажите вслух, что наречия частотности вернулись сегодня внутри абзацев о временах года — студенты должны услышать, что повторение названо. Соберите посты сейчас и верните на следующем уроке.","Чеклистпен аяқтаңыз. Жиілік үстеулері бүгін мезгілдер туралы абзацтарда қайта оралғанын дауыстап айтыңыз — студенттер қайталаудың аталғанын естуі керек. Жазбаларды қазір жинап, келесі сабақта қайтарыңыз."],
w201:["Как часто вы делаете каждое из этих дел? Выберите один ответ для каждого.","Мыналардың әрқайсысын қаншалықты жиі істейсіз? Әрқайсысына бір жауап таңдаңыз."],
w202:["Здесь нечего угадывать — это просто ваша неделя.","Мұнда таппайтын ештеңе жоқ — бұл жай ғана сіздің аптаңыз."],
w203:["Запишите","Жазып алыңыз"],
w204:["Какой ответ вас удивил? Напишите об этом одно предложение. Сохраните его — оно понадобится в конце урока.","Қай жауап сізді таңғалдырды? Бұл туралы бір сөйлем жазыңыз. Сақтап қойыңыз — сабақ соңында керек болады."],
w205:["Сравните","Салыстырыңыз"],
w206:["Сравните с партнёром. Найдите одно дело, которое вы оба делаете каждый день, и одно, которое не делает ни один из вас.","Жұбыңызбен салыстырыңыз. Екеуің де күн сайын істейтін бір істі және екеуің де істемейтін бір істі табыңыз."],
w207:["Сравните с преподавателем. Найдите одно дело, которое вы оба делаете каждый день, и одно, которое не делает ни один из вас.","Мұғаліммен салыстырыңыз. Екеуің де күн сайын істейтін бір істі және екеуің де істемейтін бір істі табыңыз."],
v201:["3 · Соедините каждое слово с его значением.","3 · Әр сөзді өз мағынасымен сәйкестендіріңіз."],
v202:["4 · В помещении или на улице? Определите каждое занятие.","4 · Үй ішінде ме, әлде далада ма? Әр әрекетті орналастырыңыз."],
v203:["Думайте о том, где вы обычно это делаете, а не где это возможно.","Мұны әдетте қайда істейтініңізді ойлаңыз, қайда мүмкін екенін емес."],
v204:["5 · <b>do</b>, <b>go</b> или <b>play</b>? Именно здесь ошибаются чаще всего.","5 · <b>do</b>, <b>go</b> әлде <b>play</b> ма? Дәл осы жерде ең жиі қателеседі."],
v205:["Здесь есть закономерность. <b>go</b> — с занятиями на <i>-ing</i>; <b>play</b> — с играми; <b>do</b> — почти со всем остальным.","Мұнда заңдылық бар. <b>go</b> — <i>-ing</i> жалғауымен келетін әрекеттермен; <b>play</b> — ойындармен; <b>do</b> — қалғанының көбімен."],
v206:["6 · Работайте в парах. Две минуты, один список.","6 · Жұпта жұмыс істеңіз. Екі минут, бір тізім."],
v207:["Студент A называет глагол — <b>do</b>, <b>go</b> или <b>play</b>. У студента B есть десять секунд, чтобы назвать два занятия с этим глаголом. Затем поменяйтесь. Отметьте задание выполненным после трёх ходов каждого.","A студенті етістік атайды — <b>do</b>, <b>go</b> немесе <b>play</b>. B студентінің осы етістікпен екі әрекет атауға он секунды бар. Содан кейін ауысыңыз. Әрқайсысы үш реттен кейін тапсырманы орындалды деп белгілеңіз."],
v208:["Если партнёр назовёт неверное — не поправляйте сразу. Запишите и разберите вместе в конце.","Жұбыңыз қате атаса — бірден түзетпеңіз. Жазып алып, соңында бірге талдаңыз."],
v209:["6 · Две минуты с преподавателем, один список.","6 · Мұғаліммен екі минут, бір тізім."],
v210:["Преподаватель называет глагол — <b>do</b>, <b>go</b> или <b>play</b>. У вас десять секунд, чтобы назвать два занятия. Затем вы называете глагол, а отвечает преподаватель.","Мұғалім етістік атайды — <b>do</b>, <b>go</b> немесе <b>play</b>. Сізде екі әрекет атауға он секунд бар. Содан кейін сіз етістік атайсыз, мұғалім жауап береді."],
v211:["Преподавателю: отмечайте ошибки, но не прерывайте темп. Разберите их вместе в конце.","Мұғалімге: қателерді белгілеңіз, бірақ қарқынды бөлмеңіз. Соңында бірге талдаңыз."],
v212:["7 · Дополните предложения об обычной неделе.","7 · Кәдімгі апта туралы сөйлемдерді толықтырыңыз."],
g201:["Прочитайте эти четыре предложения из текста.","Мәтіндегі мына төрт сөйлемді оқыңыз."],
g202:["В первых трёх предложениях — где стоит слово частотности?","Алғашқы үш сөйлемде жиілік сөзі қай жерде тұр?"],
g203:["Где стоит слово","Сөз қай жерде тұрады"],
g204:["Теперь расставьте шесть слов по порядку — от 100% до 0%.","Енді алты сөзді 100%-дан 0%-ға дейін ретімен қойыңыз."],
g205:["ФОРМА. Наречие частотности ставится <b>перед смысловым глаголом</b> — <i>I usually start at seven</i> — но <b>после <i>be</i></b>: <i>I am usually late</i>. Если есть вспомогательный глагол, наречие идёт после него: <i>I don't usually work nights</i>.","ТҰЛҒАСЫ. Жиілік үстеуі <b>негізгі етістіктің алдында</b> тұрады — <i>I usually start at seven</i> — бірақ <b><i>be</i>-ден кейін</b>: <i>I am usually late</i>. Көмекші етістік болса, үстеу одан кейін келеді: <i>I don't usually work nights</i>."],
g206:["ШКАЛА. always 100% · usually · often · sometimes · hardly ever · never 0%. <i>Hardly ever</i> и <i>rarely</i> значат «почти никогда», а не «никогда».","ШКАЛА. always 100% · usually · often · sometimes · hardly ever · never 0%. <i>Hardly ever</i> мен <i>rarely</i> «мүлдем емес» емес, «дерлік ешқашан» дегенді білдіреді."],
g207:["ВЫРАЖЕНИЯ ВЕДУТ СЕБЯ ИНАЧЕ. Длинные обороты — <i>twice a week, every October, once a year</i> — ставятся в <b>конце</b> или в начале для акцента. В середине они не стоят никогда.","ТІРКЕСТЕР БАСҚАША. Ұзын тіркестер — <i>twice a week, every October, once a year</i> — <b>соңында</b> немесе екпін үшін басында тұрады. Ортасында ешқашан тұрмайды."],
g208:["Нельзя: «I go usually to the gym», «She never is late», «He go every day».","Былай болмайды: «I go usually to the gym», «She never is late», «He go every day»."],
g209:["Вопросы возвращаются: <i>How often do you…?</i> — это порядок слов из урока 1 с вопросительным словом частотности впереди.","Сұрақтар қайта оралады: <i>How often do you…?</i> — бұл 1-сабақтағы сөз тәртібі, алдында жиілік сұрау сөзі тұр."],
g210:["Четыре настоящих предложения из аудиозаписи учебника.","Оқулық жазбасынан алынған төрт нақты сөйлем."],
s205:["ФОРМА. Наречие частотности ставится <b>перед смысловым глаголом</b>: <i>I usually start at seven</i>. Есть одно исключение — глагол <i>be</i>: с <i>am, is, are, was, were</i> наречие идёт <b>после</b> него: <i>I am usually late</i>, а не <i>I usually am late</i>. Если есть вспомогательный глагол, наречие встаёт между ним и смысловым глаголом: <i>I don't usually work nights</i>.","ТҰЛҒАСЫ. Жиілік үстеуі <b>негізгі етістіктің алдында</b> тұрады: <i>I usually start at seven</i>. Бір ерекшелік бар — <i>be</i> етістігі: <i>am, is, are, was, were</i> сөздерімен үстеу одан <b>кейін</b> келеді: <i>I am usually late</i>, <i>I usually am late</i> емес. Көмекші етістік болса, үстеу онымен негізгі етістіктің арасына түседі: <i>I don't usually work nights</i>."],
s206:["ШКАЛА. always 100% · usually около 80% · often около 60% · sometimes около 40% · hardly ever около 10% · never 0%. Два из них подводят чаще всего: <i>hardly ever</i> и <i>rarely</i> значат «<b>почти</b> никогда», а не «никогда» — и, поскольку они уже отрицательные, второе отрицание не добавляют. <i>I hardly ever don't go</i> — ошибка.","ШКАЛА. always 100% · usually шамамен 80% · often шамамен 60% · sometimes шамамен 40% · hardly ever шамамен 10% · never 0%. Екеуі жиі шатастырады: <i>hardly ever</i> мен <i>rarely</i> «ешқашан» емес, «<b>дерлік</b> ешқашан» дегенді білдіреді — және олар өзі болымсыз болғандықтан, екінші болымсыздық қосылмайды. <i>I hardly ever don't go</i> — қате."],
s207:["ВЫРАЖЕНИЯ ВЕДУТ СЕБЯ ИНАЧЕ. Короткие наречия стоят в середине; длинные выражения — <i>twice a week, three times a month, every October, once a year</i> — ставятся в <b>конце</b> предложения или в <b>начале</b>, если вы хотите их выделить. Чего они не делают никогда — не стоят в середине: <i>I twice a week go swimming</i> — это не английский.","ТІРКЕСТЕР БАСҚАША. Қысқа үстеулер ортада тұрады; ұзын тіркестер — <i>twice a week, three times a month, every October, once a year</i> — сөйлемнің <b>соңында</b>, ал ерекше атап өткіңіз келсе <b>басында</b> тұрады. Ешқашан істемейтіні — ортада тұру: <i>I twice a week go swimming</i> дегеніңіз ағылшынша емес."],
s208:["Три ошибки, за которыми стоит следить: «I go usually to the gym» (наречие после глагола) · «She never is late» (наречие перед <i>be</i>) · «He go every day» (пропущено <b>-s</b> в третьем лице).","Назар аударатын үш қате: «I go usually to the gym» (үстеу етістіктен кейін) · «She never is late» (үстеу <i>be</i>-ден бұрын) · «He go every day» (үшінші жақтағы <b>-s</b> түсіп қалған)."],
s209:["Вопросы возвращаются. <i>How often do you go to the gym?</i> — это в точности порядок из урока 1: вопросительное слово, вспомогательный глагол, подлежащее, смысловой глагол — с вопросительным словом частотности впереди. Present Continuous в противопоставлении этому времени вы встретите в уроке 4.","Сұрақтар қайта оралады. <i>How often do you go to the gym?</i> — бұл дәл 1-сабақтағы тәртіп: сұрау сөзі, көмекші етістік, бастауыш, негізгі етістік — алдында жиілік сұрау сөзі. Present Continuous-ты осы шақпен салыстыруды 4-сабақта кездестіресіз."],
p201:["1 · Нажмите на пропуск, куда подходит слово.","1 · Сөз келетін бос орынды басыңыз."],
p202:["Правильный пропуск только один. Если выберете не тот, увидите почему.","Дұрыс бос орын біреу ғана. Қатесін таңдасаңыз, себебін көресіз."],
p203:["2 · Какое слово подходит по смыслу? Сначала прочитайте всё предложение.","2 · Мағынасы бойынша қай сөз келеді? Алдымен сөйлемді толық оқыңыз."],
p204:["3 · В каждом предложении одна ошибка. Напечатайте слово, которое стоит неверно.","3 · Әр сөйлемде бір қате бар. Қате тұрған сөзді теріңіз."],
p205:["Например: <i>He go every day.</i> → <b>go</b>","Мысалы: <i>He go every day.</i> → <b>go</b>"],
p206:["4 · Составьте предложение. Нажимайте на слова в правильном порядке.","4 · Сөйлем құрастырыңыз. Сөздерді дұрыс ретпен басыңыз."],
p207:["5 · Составьте вопрос. Напечатайте два пропущенных слова.","5 · Сұрақ құрастырыңыз. Түсіп қалған екі сөзді теріңіз."],
p208:["Например: <i>She swims twice a week.</i> → How often <b>does she</b> swim?","Мысалы: <i>She swims twice a week.</i> → How often <b>does she</b> swim?"],
p209:["6 · Две правды и ложь. Работайте в парах.","6 · Екі шындық пен бір өтірік. Жұпта жұмыс істеңіз."],
p210:["Напишите три предложения о своей неделе, в каждом — наречие частотности. Два должны быть правдой, одно — ложью. Прочитайте их партнёру: партнёр задаёт два вопроса <i>How often…?</i> и угадывает ложь. Затем поменяйтесь.","Аптаңыз туралы үш сөйлем жазыңыз, әрқайсысында жиілік үстеуі болсын. Екеуі шындық, біреуі өтірік. Жұбыңызға оқып беріңіз: ол екі <i>How often…?</i> сұрағын қойып, өтірігін табады. Содан кейін ауысыңыз."],
p211:["Главное — вопросы, а не догадка. Заставьте партнёра поработать.","Ең бастысы — сұрақтар, тапқаны емес. Жұбыңызды ойландырыңыз."],
p212:["6 · Две правды и ложь, с преподавателем.","6 · Екі шындық пен бір өтірік, мұғаліммен."],
p213:["Напишите три предложения о своей неделе с наречием частотности в каждом. Два правдивых, одно ложное. Прочитайте преподавателю — он задаёт два вопроса <i>How often…?</i> и угадывает. Затем то же делает преподаватель, а угадываете вы.","Аптаңыз туралы әрқайсысында жиілік үстеуі бар үш сөйлем жазыңыз. Екеуі шын, біреуі жалған. Мұғалімге оқып беріңіз — ол екі <i>How often…?</i> сұрағын қойып, табады. Содан кейін мұғалім солай істейді, ал сіз табасыз."],
p214:["Преподавателю: перед догадкой задайте уточняющий вопрос. Именно в нём и рождается язык.","Мұғалімге: болжамас бұрын нақтылаушы сұрақ қойыңыз. Тіл дәл сонда туады."],
p215:["7 · Третье лицо. Напечатайте правильную форму глагола.","7 · Үшінші жақ. Етістіктің дұрыс тұлғасын теріңіз."],
r201:["Перед чтением: медсестра в ночную смену, фрилансер и фермер.","Оқу алдында: түнгі ауысымдағы медбике, фрилансер және фермер."],
r202:["Как вы думаете, кто спит меньше всех? Выберите одного, затем прочитайте и проверьте.","Сіздіңше, кім ең аз ұйықтайды? Біреуін таңдап, оқып тексеріңіз."],
r203:["Пока правильного ответа нет. Это ваше предположение.","Әзірге дұрыс жауап жоқ. Бұл — сіздің болжамыңыз."],
r204:["1 · Прочитайте один раз. Какое предложение выражает мысль всего текста?","1 · Бір рет оқыңыз. Қай сөйлем бүкіл мәтіннің ойын білдіреді?"],
r205:["2 · Кто это? Прочитайте ещё раз и выберите человека.","2 · Бұл кім? Қайта оқып, адамды таңдаңыз."],
r206:["3 · Числа в тексте. Ответьте числом или одним словом.","3 · Мәтіндегі сандар. Санмен немесе бір сөзбен жауап беріңіз."],
r207:["4 · Найдите в тексте слово или выражение со значением…","4 · Мәтіннен мына мағынадағы сөзді немесе тіркесті табыңыз…"],
r208:["5 · Найдите слова частотности. Выпишите пропущенное слово из текста.","5 · Жиілік сөздерін табыңыз. Мәтіннен түсіп қалған сөзді жазып алыңыз."],
r209:["6 · Чья неделя показалась бы вам самой тяжёлой?","6 · Кімнің аптасы сізге ең ауыр көрінер еді?"],
r210:["В каждом объяснении используйте наречие частотности: <i>I could never…</i>, <i>I hardly ever…</i>, <i>I usually…</i>","Әр түсіндірмеде жиілік үстеуін қолданыңыз: <i>I could never…</i>, <i>I hardly ever…</i>, <i>I usually…</i>"],
r211:["После чтения","Оқығаннан кейін"],
r212:["Чья неделя ближе всего к вашей? Напишите два предложения и используйте в каждом наречие частотности.","Кімнің аптасы сіздікіне ең жақын? Екі сөйлем жазып, әрқайсысында жиілік үстеуін қолданыңыз."],
l201:["Перед прослушиванием: Харуки Мураками — японский писатель, который бегает почти каждый день.","Тыңдау алдында: Харуки Мураками — күн сайын дерлік жүгіретін жапон жазушысы."],
l202:["Как вы думаете, сколько он пробегает за неделю? Выберите вариант, затем послушайте вторую часть и проверьте.","Сіздіңше, ол бір аптада қанша жүгіреді? Нұсқаны таңдап, екінші бөлікті тыңдап тексеріңіз."],
l203:["Сначала предположите. Догадка заставляет вас вслушиваться в число.","Алдымен болжаңыз. Болжам сізді санды тыңдауға мәжбүрлейді."],
l204:["1 · Первая часть. Слушайте общий смысл — пока ничего не записывайте.","1 · Бірінші бөлік. Жалпы мағынасын тыңдаңыз — әзірге ештеңе жазбаңыз."],
l205:["2 · Вторая часть. Здесь вся лексика частотности. Слушайте, как часто.","2 · Екінші бөлік. Жиілік лексикасының бәрі осында. Қаншалықты жиі екенін тыңдаңыз."],
l206:["Три вопроса, три ответа. Нажмите на любой, чтобы прослушать этот фрагмент ещё раз.","Үш сұрақ, үш жауап. Осы үзіндіні қайта тыңдау үшін кез келгенін басыңыз."],
l207:["3 · Послушайте ещё раз и напишите слово частотности, которое слышите.","3 · Қайта тыңдап, естіген жиілік сөзін жазыңыз."],
l208:["4 · Три отдельных предложения. Где в каждом стоит слово частотности?","4 · Үш жеке сөйлем. Әрқайсысында жиілік сөзі қай жерде тұр?"],
l209:["Прослушайте каждое, затем выберите. Это те же предложения, что были в грамматическом слайдере.","Әрқайсысын тыңдап, содан кейін таңдаңыз. Бұл грамматика слайдерінде болған сөйлемдер."],
l210:["Теперь используйте это","Енді мұны қолданыңыз"],
n201:["Полезные фразы","Пайдалы тіркестер"],
n202:["1 · Найдите того, кто…","1 · Мынадай адамды табыңыз…"],
n203:["Встаньте. Спрашивайте <i>How often do you…?</i> или <i>Do you ever…?</i> Впишите одно имя в каждую строку. Одно имя дважды использовать нельзя.","Тұрыңыз. <i>How often do you…?</i> немесе <i>Do you ever…?</i> деп сұраңыз. Әр жолға бір есім жазыңыз. Бір есімді екі рет жазуға болмайды."],
n204:["Затем расскажите полными предложениями: <i>Aigerim hardly ever eats breakfast.</i> Не просто имя.","Содан кейін толық сөйлеммен айтып беріңіз: <i>Aigerim hardly ever eats breakfast.</i> Тек есімін емес."],
n205:["После опроса выслушайте четыре ответа. Дайте обратную связь только по двум вещам: одно наречие поставлено верно, одно — неверно.","Сауалнамадан кейін төрт жауап тыңдаңыз. Тек екі нәрсе бойынша кері байланыс беріңіз: бір үстеу дұрыс қойылған, біреуі қате."],
n206:["1 · Возьмите у преподавателя интервью об обычной неделе.","1 · Мұғалімнен кәдімгі апта туралы сұхбат алыңыз."],
n207:["Задайте не менее шести вопросов <i>How often…?</i> и запишите ответы. Затем преподаватель берёт интервью у вас.","Кемінде алты <i>How often…?</i> сұрағын қойып, жауаптарын жазыңыз. Содан кейін мұғалім сізден сұхбат алады."],
n208:["Затем скажите три вещи в ответ: <i>You usually…, you hardly ever…, you never…</i>","Содан кейін үш нәрсені айтып беріңіз: <i>You usually…, you hardly ever…, you never…</i>"],
n209:["Отвечайте честно и подробно — студенту нужен реальный материал для пересказа. Обратная связь: одно наречие на месте, одно не на месте.","Шыншыл әрі толық жауап беріңіз — студентке айтып беруге нақты материал керек. Кері байланыс: бір үстеу орнында, біреуі орнында емес."],
n210:["1 · Напишите об обычной неделе — своей.","1 · Кәдімгі апта туралы жазыңыз — өз аптаңыз туралы."],
n211:["Шесть предложений. В каждом — своё слово частотности, и хотя бы в одном поставьте выражение в конец.","Алты сөйлем. Әрқайсысында бөлек жиілік сөзі болсын, кемінде біреуінде тіркесті соңына қойыңыз."],
n212:["2 · Теперь напишите три вопроса, которые вы задали бы Алие, Диасу или Руслану.","2 · Енді Әлия, Диас немесе Русланға қояр едіңіз деген үш сұрақ жазыңыз."],
t704:["Завершите уроком-чеклистом. Скажите вслух, что вопросительные формы вернулись сегодня как <i>How often…?</i> — студенты должны услышать, что повторение названо.","Сабақты чеклистпен аяқтаңыз. Сұрақ тұлғалары бүгін <i>How often…?</i> түрінде қайта оралғанын дауыстап айтыңыз — студенттер қайталаудың аталғанын естуі керек."],
/* stage 1 */
t101:["Прочитайте шесть вопросов. Какие три вам задают чаще всего?","Алты сұрақты оқыңыз. Сізге қай үшеуі жиі қойылады?"],
t102:["Правильного ответа нет. Выберите три и запишите свой ответ ниже.","Дұрыс жауап жоқ. Үшеуін таңдап, жауабыңызды төменге жазыңыз."],
t103:["Правильного ответа нет. Выберите три и расскажите преподавателю.","Дұрыс жауап жоқ. Үшеуін таңдап, мұғаліміңізге айтыңыз."],
t104:["Правильного ответа нет. Выберите три и сравните с партнёром.","Дұрыс жауап жоқ. Үшеуін таңдап, жұбыңызбен салыстырыңыз."],
t105:["Запишите","Жазып алыңыз"],
t106:["Обсудите","Талқылаңыз"],
/* stage 2 */
t201:["Прочитайте слова. Нажмите на карточку, чтобы увидеть пример.","Сөздерді оқыңыз. Мысалды көру үшін карточканы басыңыз."],
t202:["Показать перевод","Аудармасын көрсету"],
t203:["Соедините каждое слово с его значением.","Әр сөзді өз мағынасымен сәйкестендіріңіз."],
t204:["Дополните предложения. Выберите правильное слово.","Сөйлемдерді толықтырыңыз. Дұрыс сөзді таңдаңыз."],
/* stage 3 */
t301:["Прочитайте эти четыре вопроса.","Мына төрт сұрақты оқыңыз."],
t302:["Что во всех четырёх вопросах идёт сразу после вопросительного слова?","Төрт сұрақта да сұрау сөзінен кейін бірден не тұр?"],
t303:["Порядок слов","Сөз тәртібі"],
t304:["Показать схему","Схеманы көрсету"],
t305:["Скрыть схему","Схеманы жасыру"],
t306:["вспомогательный глагол","көмекші етістік"],
t307:["подлежащее","бастауыш"],
/* grammar explanation — live builds */
g1:["Порядок слов никогда не меняется: (вопросительное слово) + вспомогательный глагол + подлежащее + смысловой глагол.",
    "Сөз тәртібі ешқашан өзгермейді: (сұрау сөзі) + көмекші етістік + бастауыш + негізгі етістік."],
g2:["Время показывает вспомогательный глагол, поэтому смысловой глагол остаётся в начальной форме: did you go, а не did you went.",
    "Шақты көмекші етістік білдіреді, сондықтан негізгі етістік бастапқы тұлғада қалады: did you go, did you went емес."],
g3:["Вспомогательный глагол выбирается по времени: do / does, am / is / are, did, have / has.",
    "Көмекші етістік шаққа қарай таңдалады: do / does, am / is / are, did, have / has."],
g4:["Нельзя: «Where you live?», «What did you went?», «How long you know her?»",
    "Былай болмайды: «Where you live?», «What did you went?», «How long you know her?»"],
g5:["Вопросительные формы вернутся вместе с Past Continuous в уроке 8.",
    "Сұрақ тұлғалары 8-сабақта Past Continuous-пен бірге қайта кездеседі."],
/* grammar explanation — self-study (fuller) */
s1:["Порядок слов никогда не меняется. Сначала вопросительное слово, затем вспомогательный глагол, затем подлежащее, затем смысловой глагол: How long · have · you · lived here? Этот порядок одинаков во всех временах — освоив его один раз, вы получаете все остальные.",
    "Сөз тәртібі ешқашан өзгермейді. Алдымен сұрау сөзі, содан кейін көмекші етістік, одан кейін бастауыш, сосын негізгі етістік: How long · have · you · lived here? Бұл тәртіп барлық шақта бірдей — бір рет меңгерсеңіз, қалғаны да оңай болады."],
s2:["Время показывает вспомогательный глагол, а не смысловой. Именно поэтому мы говорим did you go, а не did you went, и does she work, а не does she works. Время показывает только одно слово — вспомогательный глагол.",
    "Шақты негізгі етістік емес, көмекші етістік білдіреді. Сондықтан біз did you went емес, did you go деп, does she works емес, does she work деп айтамыз. Шақты тек бір сөз — көмекші етістік көрсетеді."],
s3:["Вспомогательный глагол выбирайте по нужному времени: do / does — Present Simple (привычки и факты), am / is / are — Present Continuous (сейчас или запланировано), did — Past Simple (завершённое время), have / has — Present Perfect (период, который ещё продолжается, часто с how long).",
    "Көмекші етістікті қажет шаққа қарай таңдаңыз: do / does — Present Simple (әдет пен факт), am / is / are — Present Continuous (дәл қазір немесе жоспарланған), did — Past Simple (аяқталған уақыт), have / has — Present Perfect (әлі жалғасып жатқан кезең, көбіне how long-пен)."],
s4:["Три ошибки, за которыми стоит следить: «Where you live?» (нет вспомогательного глагола) · «What did you went?» (время показано дважды) · «How long you know her?» (пропущено have).",
    "Назар аударатын үш қате: «Where you live?» (көмекші етістік жоқ) · «What did you went?» (шақ екі рет көрсетілген) · «How long you know her?» (have түсіп қалған)."],
s5:["Одно исключение стоит выучить сразу: когда вопросительное слово само является подлежащим — Who lives with you?, What happened? — вспомогательный глагол не нужен. Вопросительные формы вернутся вместе с Past Continuous в уроке 8.",
    "Бірден үйрететін бір ерекшелік бар: сұрау сөзінің өзі бастауыш болғанда — Who lives with you?, What happened? — көмекші етістік қосылмайды. Сұрақ тұлғалары 8-сабақта Past Continuous-пен бірге қайта кездеседі."],
/* stage 4 */
t211:["2 · Соедините слово с картинкой.","2 · Сөзді суретпен сәйкестендіріңіз."],
t212:["Нажмите на слово, затем на картинку, к которой оно относится. Смотрите внимательно — некоторые пары очень близки.","Алдымен сөзді, содан кейін оған қатысты суретті басыңыз. Мұқият қараңыз — кейбір жұптар өте ұқсас."],
t205:["2 · Какое слово подходит? Эти пары легко перепутать.","2 · Қай сөз келеді? Бұл жұптарды шатастыру оңай."],
t206:["Прочитайте всё предложение до конца. Слова похожи, но подходит только одно.","Сөйлемді толық оқыңыз. Сөздер ұқсас, бірақ біреуі ғана келеді."],
t207:["3 · Какой глагол сочетается с каждым словом? Выберите естественную пару.","3 · Әр сөзбен қай етістік тіркеседі? Табиғи жұбын таңдаңыз."],
t208:["В английском некоторые слова закреплены друг за другом. Учить пару быстрее, чем слово отдельно.","Ағылшынша кейбір сөздер бір-бірімен бекітілген. Жұбымен үйрену жеке үйренуден жылдам."],
t209:["4 · Образуйте слово. Напечатайте нужную форму.","4 · Сөзді жасаңыз. Қажетті тұлғаны теріңіз."],
t210:["Многие английские слова образуют семьи. Одно окончание меняет роль слова.","Көптеген ағылшын сөздері бір ұядан шығады. Бір жалғау сөздің қызметін өзгертеді."],
t408:["3 · Ответьте кратким ответом. Напечатайте вспомогательный глагол.","3 · Қысқа жауап беріңіз. Көмекші етістікті теріңіз."],
t409:["Например: Do you live near here? → Yes, I do.","Мысалы: Do you live near here? → Yes, I do."],
t410:["4 · Дополните диалог. Напечатайте по одному слову в каждый пропуск.","4 · Диалогты толықтырыңыз. Әр бос орынға бір сөзден теріңіз."],
t411:["5 · Составьте вопрос. Нажимайте на слова в правильном порядке.","5 · Сұрақ құрастырыңыз. Сөздерді дұрыс ретпен басыңыз."],
t412:["Нажмите на слово, чтобы добавить его. Нажмите ещё раз, чтобы убрать.","Сөзді қосу үшін оны басыңыз. Алып тастау үшін қайта басыңыз."],
g6:["КРАТКИЕ ОТВЕТЫ. Повторяйте вспомогательный глагол, а не смысловой: Do you live here? → Yes, I do. Не «Yes, I live».","ҚЫСҚА ЖАУАПТАР. Негізгі етістікті емес, көмекші етістікті қайталаңыз: Do you live here? → Yes, I do. «Yes, I live» емес."],
s6:["Краткие ответы повторяют вспомогательный глагол, а не смысловой. Do you live here? → Yes, I do. / No, I don't. Did she call? → Yes, she did. Have you finished? → Yes, I have. «Yes, I live» звучит для носителя неправильно, хотя смысл понятен.","Қысқа жауаптар негізгі етістікті емес, көмекші етістікті қайталайды. Do you live here? → Yes, I do. / No, I don't. Did she call? → Yes, she did. Have you finished? → Yes, I have. «Yes, I live» мағынасы түсінікті болғанмен, ана тілінде сөйлейтінге қате естіледі."],
s7:["Два полезных приёма. Отрицательный вопрос смягчает совет: Why don't you ask her? означает «я думаю, тебе стоит». А How long…? почти всегда идёт с Present Perfect, если ситуация продолжается: How long have you lived here? — вы всё ещё там живёте.","Екі пайдалы тәсіл. Болымсыз сұрақ кеңесті жұмсартады: Why don't you ask her? — «менің ойымша, солай еткен жөн» дегені. Ал How long…? жағдай жалғасып жатса, әрдайым дерлік Present Perfect-пен келеді: How long have you lived here? — сіз әлі сонда тұрасыз."],
t213:["5 · Работайте в парах. Проверьте друг друга на знание слов.","5 · Жұпта жұмыс істеңіз. Бір-біріңізді сөздерден тексеріңіз."],
t214:["Студент A читает значение с карточки A. Студент B называет слово, не подглядывая. Затем поменяйтесь карточками. Отметьте задание выполненным, когда закончите оба.","A студенті A карточкасынан мағынасын оқиды. B студенті қарамай сөзді айтады. Содан кейін карточкаларды ауыстырыңыз. Екеуің де аяқтағанда тапсырманы орындалды деп белгілеңіз."],
t215:["По пять слов каждому. Если партнёр не может вспомнить слово, подскажите первый звук, а не ответ.","Әрқайсысына бес сөзден. Жұбыңыз сөзді еске түсіре алмаса, жауапты емес, бірінші дыбысын айтыңыз."],
t216:["5 · Проверьте себя с преподавателем.","5 · Мұғаліммен бірге тексеріңіз."],
t217:["Преподаватель читает значение. Вы называете слово, не подглядывая. Затем вы читаете значение, а преподаватель отвечает. Отметьте выполненным, когда закончите оба.","Мұғалім мағынасын оқиды. Сіз қарамай сөзді айтасыз. Содан кейін сіз мағынасын оқисыз, мұғалім жауап береді. Екеуің де аяқтағанда орындалды деп белгілеңіз."],
t413:["6 · Вопросный теннис. Работайте в парах.","6 · Сұрақ теннисі. Жұпта жұмыс істеңіз."],
t414:["Студент A задаёт вопрос со вспомогательным глаголом со своей карточки. Студент B отвечает и задаёт следующий в ответ. Продолжайте, пока не используете все шесть. Не повторяйте вопросительные слова.","A студенті өз карточкасындағы көмекші етістікпен сұрақ қояды. B студенті жауап беріп, кезекті сұрағын қояды. Алтауын да қолданғанша жалғастырыңыз. Сұрау сөздерін қайталамаңыз."],
t415:["Если партнёр перепутал порядок слов, повторите вопрос правильно и продолжайте. Не останавливайтесь на объяснения.","Жұбыңыз сөз тәртібін шатастырса, сұрақты дұрыс қайталап, әрі қарай жүріңіз. Түсіндіру үшін тоқтамаңыз."],
t416:["6 · Вопросный теннис с преподавателем.","6 · Мұғаліммен сұрақ теннисі."],
t417:["Вы задаёте вопрос со вспомогательным глаголом со своей карточки. Преподаватель отвечает и задаёт следующий. Продолжайте, пока не используете все шесть.","Сіз өз карточкаңыздағы көмекші етістікпен сұрақ қоясыз. Мұғалім жауап беріп, келесі сұрағын қояды. Алтауын да қолданғанша жалғастырыңыз."],
t418:["Преподавателю: один раз переформулируйте неверный вопрос правильно и продолжайте. Ошибки собирайте на конец, не прерывайте темп.","Мұғалімге: қате сұрақты бір рет дұрыстап қайталап, әрі қарай жүріңіз. Қателерді соңына жинаңыз, қарқынды бөлмеңіз."],
t419:["6 · Арон расположил свои вопросы по порядку — от лёгких к очень личным. Сделайте то же самое.","6 · Арон сұрақтарын жеңілден өте жекеге қарай ретімен қойды. Сіз де солай жасаңыз."],
t420:["Единственно правильного порядка нет. Будьте готовы объяснить, почему один вопрос идёт раньше другого.","Жалғыз дұрыс рет жоқ. Бір сұрақтың неге екіншісінен бұрын тұрғанын түсіндіруге дайын болыңыз."],
l211:["4 · Что из этого Мураками действительно делает? Отметьте всё верное.","4 · Мыналардың қайсысын Мураками шынымен істейді? Барлық дұрысын белгілеңіз."],
l212:["Четыре из шести — правда. Два — нет. При необходимости используйте кнопки повтора.","Алтауының төртеуі — шындық. Екеуі — жоқ. Қажет болса қайталау түймелерін қолданыңыз."],
l213:["Два из них — то, чего он, по его словам, <i>не</i> делает. Слушайте отрицание.","Екеуі — оның айтуынша <i>істемейтін</i> нәрсе. Болымсыздықты тыңдаңыз."],
w208:["Затем скажите классу одно предложение о партнёре. Не называйте имя — пусть класс угадает, о ком речь.","Содан кейін сыныпқа жұбыңыз туралы бір сөйлем айтыңыз. Атын атамаңыз — сынып кім екенін тапсын."],
r213:["2 · Числа. Прочитайте ещё раз и ответьте числом.","2 · Сандар. Қайта оқып, санмен жауап беріңіз."],
r214:["4 · В тексте этого прямо не сказано. Что можно вывести?","4 · Мәтінде бұл тікелей айтылмаған. Нені қорытуға болады?"],
r215:["Все ответы есть в тексте, но нужно соединить две мысли.","Барлық жауап мәтінде бар, бірақ екі ойды байланыстыру керек."],
r216:["Сравните себя с данными опроса, а не с тремя героями. Вы спите больше или меньше девяти часов? Тратите на досуг больше или меньше пяти часов? Напишите три предложения, в каждом — своё наречие частотности.","Өзіңізді үш кейіпкермен емес, сауалнама деректерімен салыстырыңыз. Тоғыз сағаттан көп ұйықтайсыз ба, аз ба? Демалысқа бес сағаттан көп жұмсайсыз ба, аз ба? Үш сөйлем жазыңыз, әрқайсысында бөлек жиілік үстеуі болсын."],
t401:["1 · Выберите правильный вспомогательный глагол.","1 · Дұрыс көмекші етістікті таңдаңыз."],
t402:["2 · В каждом вопросе одно слово неверное. Напечатайте правильное слово.","2 · Әр сұрақта бір сөз қате. Дұрыс сөзді теріңіз."],
t403:["Например: What does you do? → do","Мысалы: What does you do? → do"],
t404:["3 · Соедините каждый ответ с его вопросом.","3 · Әр жауапты өз сұрағымен сәйкестендіріңіз."],
t405:["3 · Составьте вопрос из предложения. Напечатайте два пропущенных слова.","3 · Сөйлемнен сұрақ құрастырыңыз. Түсіп қалған екі сөзді теріңіз."],
t406:["Например: She lives in Almaty. → Where does she live?","Мысалы: She lives in Almaty. → Where does she live?"],
t407:["4 · Настоящее или прошедшее время?","4 · Осы шақ па, өткен шақ па?"],
/* stage 5 */
t520:["Правильного ответа здесь нет. Это ваше предположение.","Мұнда дұрыс жауап жоқ. Бұл — сіздің болжамыңыз."],
t521:["3 · Расставьте эксперимент Арона по порядку. Нажимайте на шаги в том порядке, в котором они происходили.","3 · Аронның тәжірибесін ретімен қойыңыз. Қадамдарды болған ретімен басыңыз."],
t522:["После чтения","Оқығаннан кейін"],
t523:["Перед прослушиванием: как вы думаете, какие из этих тем прозвучат? Решите, затем прослушайте один раз и отметьте только те темы, которые действительно есть.","Тыңдау алдында: сіздіңше, осы тақырыптардың қайсысы естіледі? Шешіп алыңыз да, бір рет тыңдап, шынымен бар тақырыптарды ғана белгілеңіз."],
t524:["Пять тем из восьми есть в записи. Трёх нет.","Сегіз тақырыптың бесеуі жазбада бар. Үшеуі жоқ."],
t501:["Перед чтением: двое незнакомых людей сидят в комнате и задают друг другу 36 личных вопросов в течение 45 минут.","Оқу алдында: екі бейтаныс адам бөлмеде отырып, бір-біріне 45 минут бойы 36 жеке сұрақ қояды."],
t502:["Как вы думаете, почувствуют ли они себя ближе друг другу? Сначала решите, потом прочитайте и проверьте, были ли вы правы.","Сіздіңше, олар бір-біріне жақындай ма? Алдымен шешіңіз, содан кейін оқып, дұрыс болжағаныңызды тексеріңіз."],
t503:["Скажите свои три вопроса преподавателю. Затем прочитайте и проверьте.","Үш сұрағыңызды мұғалімге айтыңыз. Содан кейін оқып, тексеріңіз."],
t504:["Скажите свои три вопроса партнёру. Затем прочитайте и проверьте.","Үш сұрағыңызды жұбыңызға айтыңыз. Содан кейін оқып, тексеріңіз."],
t505:["1 · Прочитайте один раз, чтобы понять главное. Выберите лучший ответ.","1 · Негізгі ойды түсіну үшін бір рет оқыңыз. Ең дұрыс жауапты таңдаңыз."],
t506:["2 · Прочитайте ещё раз, обращая внимание на детали. Ответьте одним-двумя словами.","2 · Егжей-тегжейіне назар аударып, қайта оқыңыз. Бір-екі сөзбен жауап беріңіз."],
t507:["4 · Найдите в тексте слово, которое означает…","4 · Мәтіннен мына мағынаны білдіретін сөзді табыңыз…"],
t508:["5 · Посмотрите на пять вопросов в тексте. Выпишите вспомогательный глагол из каждого.","5 · Мәтіндегі бес сұраққа қараңыз. Әрқайсысынан көмекші етістікті жазып алыңыз."],
t509:["6 · Теперь послушайте. Восемь вопросов, один за другим.","6 · Енді тыңдаңыз. Сегіз сұрақ, бірінен соң бірі."],
t510:["Нажмите на номер, чтобы прослушать этот вопрос отдельно.","Сұрақты жеке тыңдау үшін нөмірді басыңыз."],
t511:["7 · Послушайте ещё раз. Два вопроса из восьми — о прошлом. Отметьте оба.","7 · Қайта тыңдаңыз. Сегіз сұрақтың екеуі өткен шақта. Екеуін де белгілеңіз."],
t512:["Используйте номера выше, чтобы прослушать любой вопрос ещё раз.","Кез келген сұрақты қайта тыңдау үшін жоғарыдағы нөмірлерді қолданыңыз."],
t513:["8 · Слушайте детали. Напишите вспомогательный глагол, который слышите в каждом вопросе.","8 · Егжей-тегжейін тыңдаңыз. Әр сұрақта естіген көмекші етістікті жазыңыз."],
t514:["9 · Послушайте вопросы 2, 4, 6 и 8. Отметьте их в том порядке, в котором вы их слышите.","9 · 2, 4, 6 және 8-сұрақтарды тыңдаңыз. Оларды естіген ретіңізбен белгілеңіз."],
t515:["Нажмите на карточку, чтобы присвоить ей следующий номер. Нажмите ещё раз, чтобы убрать.","Келесі нөмірді беру үшін карточканы басыңыз. Алып тастау үшін қайта басыңыз."],
t516:["Теперь используйте их","Енді оларды қолданыңыз"],
t517:["Включите запись ещё раз. После каждого вопроса есть пауза — используйте её. Скажите свой ответ вслух, пока не начался следующий вопрос.","Жазбаны тағы бір рет қосыңыз. Әр сұрақтан кейін кідіріс бар — оны пайдаланыңыз. Келесі сұрақ басталғанша жауабыңызды дауыстап айтыңыз."],
t518:["Включите запись ещё раз. После каждого вопроса есть пауза — отвечайте вслух по очереди в парах.","Жазбаны тағы қосыңыз. Әр сұрақтан кейін кідіріс бар — жұпта кезекпен дауыстап жауап беріңіз."],
t519:["Включите запись ещё раз. После каждого вопроса есть пауза — ответьте вслух, затем отвечает преподаватель.","Жазбаны тағы қосыңыз. Әр сұрақтан кейін кідіріс бар — дауыстап жауап беріңіз, содан кейін мұғалім жауап береді."],
/* stage 6 */
t601:["Работайте в парах. Возьмите карточку и проведите интервью с партнёром.","Жұпта жұмыс істеңіз. Карточканы алып, жұбыңыздан сұхбат алыңыз."],
t602:["Задайте все четыре вопроса. После каждого ответа задайте ещё один дополнительный вопрос. Затем поменяйтесь карточками.","Төрт сұрақтың бәрін қойыңыз. Әр жауаптан кейін тағы бір қосымша сұрақ қойыңыз. Содан кейін карточкаларды ауыстырыңыз."],
t603:["Работайте с преподавателем. Возьмите карточку и проведите интервью с преподавателем.","Мұғаліммен жұмыс істеңіз. Карточканы алып, мұғалімнен сұхбат алыңыз."],
t604:["Задайте все четыре вопроса. После каждого ответа задайте ещё один вопрос. Затем преподаватель берёт вторую карточку и спрашивает вас.","Төрт сұрақтың бәрін қойыңыз. Әр жауаптан кейін тағы бір сұрақ қойыңыз. Содан кейін мұғалім екінші карточканы алып, сізден сұрайды."],
t605:["1 · Напишите шесть вопросов, которые вы задали бы человеку, с которым только что познакомились.","1 · Жаңа танысқан адамға қояр едіңіз деген алты сұрақ жазыңыз."],
t606:["Минимум два вопроса должны быть о прошлом. Каждый раз используйте другое вопросительное слово.","Кемінде екі сұрақ өткен шақта болуы керек. Әр жолы басқа сұрау сөзін қолданыңыз."],
t607:["Полезные фразы","Пайдалы тіркестер"],
t608:["2 · Теперь ответьте на эти четыре вопроса о себе. Пишите полными предложениями.","2 · Енді өзіңіз туралы осы төрт сұраққа жауап беріңіз. Толық сөйлеммен жазыңыз."],
t610:["Преподавателю","Мұғалімге"],
/* stage 7 */
t701:["Отметьте всё, что вы теперь умеете.","Енді не істей алатыныңыздың бәрін белгілеңіз."],
/* dictionary UI */
d01:["Мой словарь","Менің сөздігім"],
d02:["Слова","Сөздер"],
d03:["Карточки","Карточкалар"],
d04:["Тест","Тест"],
d05:["Добавить в мой словарь","Менің сөздігіме қосу"],
d06:["В словаре","Сөздікте бар"],
d07:["Выделите любое слово в уроке, чтобы посмотреть перевод и сохранить его.","Аудармасын көріп, сақтау үшін сабақтағы кез келген сөзді белгілеңіз."],
d08:["Знаю","Білемін"],
d09:["Ещё учу","Әлі үйреніп жүрмін"],
d10:["Показать ответ","Жауабын көрсету"],
d11:["Начать тест","Тестті бастау"],
d12:["Пройти ещё раз","Қайта өту"],
d13:["Нужно минимум четыре слова, чтобы начать тест.","Тестті бастау үшін кемінде төрт сөз қажет."],
d14:["Выберите правильное значение","Дұрыс мағынасын таңдаңыз"],
d15:["Требуют повторения","Қайталауды қажет етеді"]
};

/* ======================= COURSE ======================= */

/* ======================= STATE ======================= */
let cur=0, si=0, mode='self', lessonNo=1;
let CUR=null, stages=[], VOCAB=[], DEFS=[], CTX={}, IMG={}, SLIDES=[], PICWORDS=[], PICTASK=[], NOTES={}, TIMING={}, COLLOC={};
const rail=document.getElementById('rail');
const ws=document.getElementById('workspace');
const visited=new Set();
const taskScores=new Map();
const errByStage=new Map();

function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('on');
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('on'),2200);
}

/* ======================= SIDEBAR ======================= */
/* ---- test results are part of the progress record ---- */
function testKey(kind,id){ return 'T'+kind+id; }
function saveTestScore(kind,id,got,total,pass){
  doneAll[testKey(kind,id)]={got:got,total:total,pass:pass,at:Date.now(),mode:mode};
  saveDone(); paintSidebar();
}
function getTestScore(kind,id){ return doneAll[testKey(kind,id)]||null; }
function clearTestScore(kind,id){ delete doneAll[testKey(kind,id)]; saveDone(); paintSidebar(); }

const unitsEl=document.getElementById('units');

/* ---------------------------------------------------------------------
   COURSE CONTENT MENU
   Lessons and assessments in one sequence. A Unit Test closes its unit, as
   the syllabus specifies. Every entry uses the same row, the same dot, the same
   active state and the same completion mark as a lesson.
   --------------------------------------------------------------------- */
function lesRow(attr,label,cls,kind){
  return '<button type="button" class="les '+cls+'" '+attr+'>'+
           '<span class="dot"></span><span class="lb">'+label+'</span>'+
           (kind?'<span class="kind">'+kind+'</span>':'')+
         '</button>';
}
/* The last unit's test is, per the syllabus, also the bridge check out of the
   level - it is the course's final assessment point. It therefore carries the
   title "Final Test". There is no thirteenth test: the syllabus defines twelve. */
const FINAL_UNIT=(function(){ let last=0; for(let u=1;u<=UNITS.length;u++) if(REVIEWS[u]) last=u; return last; })();
function isFinalTest(u){ return +u===FINAL_UNIT; }
function testTitle(u){ return isFinalTest(u)?'Final Test':'Unit Test &middot; Unit '+u; }
function testTitleTxt(u){ return isFinalTest(u)?'Final Test':'Unit Test \u00b7 Unit '+u; }

/* Which units the student has collapsed. Everything is open by default, so no
   lesson and no assessment is ever hidden behind a closed accordion on load. */
function closedUnits(){
  try{ return new Set(JSON.parse(localStorage.getItem('jts_preint_units_closed')||'[]')); }
  catch(e){ return new Set(); }
}
function saveClosedUnits(set){
  try{ localStorage.setItem('jts_preint_units_closed',JSON.stringify([...set])); }catch(e){}
}
function toggleAllUnits(){
  const all=[...document.querySelectorAll('#units .unit')];
  const anyOpen=all.some(d=>d.classList.contains('open'));
  const set=new Set();
  all.forEach(function(d,i){ d.classList.toggle('open',!anyOpen); if(anyOpen)set.add(i+1); });
  saveClosedUnits(set); paintExpandBtn();
}
function paintExpandBtn(){
  const b=document.getElementById('expandAll'); if(!b) return;
  const anyOpen=[...document.querySelectorAll('#units .unit')].some(d=>d.classList.contains('open'));
  b.textContent=anyOpen?'Collapse all':'Expand all';
}
function buildSidebar(){
  unitsEl.innerHTML='';
  const closed=closedUnits();
  let nLes=0,nUnitTest=0,nFinal=0;
  UNITS.forEach(function(u,i){
    const un=i+1;
    let rows='';
    u[1].forEach(function(l,j){
      const n=i*3+j+1, ready=!!LESSONS[n];
      if(ready)nLes++;
      rows+= ready
        ? lesRow('data-n="'+n+'"', n+'. '+l, '', '')
        : '<button type="button" class="les locked" data-n="'+n+'"><span class="dot"></span>'+
          '<span class="lb">'+n+'. '+l+'</span><span class="soon">soon</span></button>';
    });
    let test='';
    if(REVIEWS[un]){
      if(isFinalTest(un)){ nFinal++; test=lesRow('data-rev="'+un+'" title="Final Test \u00b7 covers Unit '+un+' and closes the level"','Final Test','asmt fin','final test'); }
      else { nUnitTest++; test=lesRow('data-rev="'+un+'"','Unit Test &middot; Unit '+un,'asmt','unit test'); }
    }

    const d=document.createElement('div');
    d.className='unit'+(closed.has(un)?'':' open');
    d.innerHTML='<button type="button" class="unit-head"><span class="n">'+un+'</span>'+
                '<span>'+u[0]+'</span><span class="prog" data-unit="'+un+'"></span>'+
                '<span class="cv">&#9654;</span></button>'+
                '<div class="unit-body">'+rows+test+'</div>';
    d.querySelector('.unit-head').onclick=function(){
      d.classList.toggle('open');
      const set=closedUnits();
      if(d.classList.contains('open'))set.delete(un); else set.add(un);
      saveClosedUnits(set); paintExpandBtn();
    };
    unitsEl.appendChild(d);

  });
  const note=document.getElementById('sideNote');
  if(note) note.textContent=nLes+' lessons \u00b7 '+nUnitTest+' unit tests \u00b7 '+nFinal+' final test';
  paintExpandBtn();
  paintSidebar();
}

/* ---- the menu as an off-canvas drawer on small screens ---- */
function openMenu(){ JCROOT().classList.add('menu-open'); }
function closeMenu(){ JCROOT().classList.remove('menu-open'); }
function toggleMenu(){ JCROOT().classList.toggle('menu-open'); }
document.addEventListener('keydown',function(e){ if(e.key==='Escape')closeMenu(); });
function paintUnitProgress(){
  document.querySelectorAll('.unit-head .prog').forEach(function(el){
    const un=+el.dataset.unit; let done=0,total=0;
    for(let j=1;j<=3;j++){ const n=(un-1)*3+j; if(LESSONS[n]){ total++; if(allDone(n))done++; } }
    if(REVIEWS[un]){ total++; const r=getTestScore('R',un); if(r&&r.pass)done++; }
    el.textContent=total?done+'/'+total:'';
    el.classList.toggle('full',total>0&&done===total);
  });
}

/* =====================================================================
   COURSE SEQUENCE AND NAVIGATION
   One ordered walk through the whole course:
     Lesson 1, 2, 3, Unit 1 Test, Lesson 4, 5, 6, Unit 2 Test,
     Lesson 7, 8, 9, Unit 3 Test, ... Lesson 36, Unit 12 Test.
   Every screen knows its neighbours, so Back / Next never dead-ends and a
   test is always reachable from the lesson before it.
   ===================================================================== */
const SEQ=(function(){
  const out=[];
  for(let u=1;u<=UNITS.length;u++){
    for(let j=0;j<3;j++){ const n=(u-1)*3+j+1; if(LESSONS[n]) out.push({t:'L',id:n}); }
    if(REVIEWS[u]) out.push({t:'R',id:u});
  }
  return out;
})();
function seqIndex(){
  if(typeof lessonNo==='number') return SEQ.findIndex(s=>s.t==='L'&&s.id===lessonNo);
  const m=String(lessonNo||'').match(/^R(.+)$/);
  if(!m) return -1;
  return SEQ.findIndex(s=>s.t==='R'&&String(s.id)===m[1]);
}
function seqOpen(step){
  if(!step) return;
  if(step.t==='L') return openLesson(step.id);
  return openReview(step.id);
}
function seqLabel(step){
  if(!step) return '';
  if(step.t==='L') return 'Lesson '+step.id+' \u00b7 '+(LESSONS[step.id]?LESSONS[step.id].title:'');
  return isFinalTest(step.id)?'Final Test \u00b7 Unit '+step.id:'Unit Test \u00b7 Unit '+step.id;
}
function seqDone(step){
  if(!step) return false;
  if(step.t==='L') return !!(LESSONS[step.id]&&allDone(step.id));
  const r=getTestScore('R',step.id);
  return !!(r&&r.pass);
}
/* Back / Next now walk the whole course, not just the lessons. */
function stepLesson(dir){
  const i=seqIndex();
  if(i<0){ const n=(typeof lessonNo==='number'?lessonNo:1)+dir; if(LESSONS[n])openLesson(n); return; }
  const j=i+dir;
  if(j<0||j>=SEQ.length){ toast(dir<0?'This is the start of the course.':'This is the end of the course.'); return; }
  seqOpen(SEQ[j]);
}
function paintSeqNav(){
  const i=seqIndex();
  const p=document.getElementById('prevLesson'), n=document.getElementById('nextLesson');
  if(!p||!n) return;
  const prev=i>0?SEQ[i-1]:null, next=(i>=0&&i<SEQ.length-1)?SEQ[i+1]:null;
  p.disabled=!prev; n.disabled=!next;
  const tag=s=>s.t==='L'?'Lesson':(isFinalTest(s.id)?'Final Test':'Unit Test');
  p.innerHTML='&lsaquo; '+(prev? tag(prev) : 'Back');
  n.innerHTML=(next? tag(next) : 'End')+' &rsaquo;';
  p.title=prev?seqLabel(prev):''; n.title=next?seqLabel(next):'';
}
/* A card at the foot of every screen: what comes next, and one button to it.
   This is a second route to every test that does not depend on the sidebar. */
function paintNextStep(){
  const host=document.getElementById('workspace'); if(!host) return;
  host.querySelectorAll('.nextstep').forEach(x=>x.remove());
  const i=seqIndex(); if(i<0) return;
  const next=SEQ[i+1];
  const box=document.createElement('div');
  box.className='nextstep'+(next&&next.t!=='L'?' test':'');
  if(!next){
    box.innerHTML='<b>That is the end of the course.</b>'+
      '<p>Every lesson and every test is behind you. You can retake any Unit Test or the Final Test from the Course content menu at any time.</p>';
  }else{
    box.innerHTML='<b>Next: '+(next.t==='L'?'lesson':(isFinalTest(next.id)?'final test':'unit test'))+'</b>'+
      '<p>'+seqLabel(next)+(seqDone(next)?' &middot; <span class="ok">done</span>':'')+'</p>'+
      '<button class="btn btn-primary" type="button" data-go="'+next.t+':'+next.id+'">Go to '+
        (next.t==='L'?'the lesson':(isFinalTest(next.id)?'the final test':'the unit test'))+' &rsaquo;</button>';
  }
  host.appendChild(box);
}
/* ---------------------------------------------------------------------
   Delegated navigation. Every clickable route in the app is resolved here,
   so a screen that is re-rendered can never lose its handlers, and a click
   anywhere inside a button (on the label, the dot or the chip) still works.
   --------------------------------------------------------------------- */
document.addEventListener('click',function(e){
  const g=e.target.closest && e.target.closest('[data-go]');
  if(g){ const [t,id]=g.dataset.go.split(':');
    seqOpen({t:t,id:(t==='L'?+id:(t==='R'?+id:id))}); return; }
  const b=e.target.closest && e.target.closest('.les[data-rev],.les[data-n]');
  if(!b) return;
  e.preventDefault();
  if(b.dataset.rev){ closeMenu(); return openReview(+b.dataset.rev); }
  const n=+b.dataset.n;
  if(LESSONS[n]){ closeMenu(); openLesson(n); } else toast('Lesson '+n+' is not built yet.');
},true);
document.addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ') return;
  const b=e.target.closest && e.target.closest('.les[data-rev],.les[data-n],[data-go]');
  if(!b) return;
  e.preventDefault(); b.click();
});
/* Open the unit that holds the active screen and bring it into view. */
function revealActive(){
  const a=document.querySelector('#units .les.active');
  if(a){ const u=a.closest('.unit'); if(u&&!u.classList.contains('open'))u.classList.add('open'); }
  const act=document.querySelector('.les.active');
  if(act&&act.scrollIntoView) try{act.scrollIntoView({block:'nearest'});}catch(err){}
}

function paintTestChip(b,kind,id){
  const r=getTestScore(kind,id);
  let c=b.querySelector('.sc');
  if(!r){ if(c)c.remove(); b.classList.remove('done'); return; }
  if(!c){ c=document.createElement('span'); c.className='sc'; b.appendChild(c); }
  c.textContent=r.got+'/'+r.total;
  c.className='sc '+(r.pass?'pass':'fail');
  b.classList.toggle('done',!!r.pass);
}
function paintSidebar(){
  if(typeof paintUnitProgress==='function')paintUnitProgress();
  document.querySelectorAll('.les').forEach(b=>{
    if(b.dataset.rev){
      b.classList.toggle('active', lessonNo==='R'+b.dataset.rev);
      paintTestChip(b,'R',b.dataset.rev); return; }
    const n=+b.dataset.n;
    b.classList.toggle('active', n===lessonNo);
    let dot=b.querySelector('.done-dot');
    const done=LESSONS[n] && allDone(n);
    if(done && !dot){const s=document.createElement('span');s.className='done-dot';b.appendChild(s);}
    if(!done && dot) dot.remove();
  });
}

/* ======================= AUDIO (real recordings only) =======================
   Embedded blob first, then ./audio/<file>. Never synthetic speech. */
function trackSrc(file){ return (window.__JC_AUDIO_BASE||'audio/')+file; }
const host=document.getElementById('audioHost');
let AUD={}, stopAt=null, activeEl=null, activeBtn=null;
function mountAudio(){
  host.innerHTML=''; AUD={};
  Object.entries(CUR.tracks||{}).forEach(([id,file])=>{
    const a=document.createElement('audio'); a.id=id; a.preload='auto'; a.src=trackSrc(file);
    a.addEventListener('timeupdate',()=>{ if(activeEl===a&&stopAt!==null&&a.currentTime>=stopAt)clearAudio(); });
    a.addEventListener('ended',clearAudio);
    a.addEventListener('error',()=>toast('Audio not found: add '+file+' to the audio folder.'));
    host.appendChild(a); AUD[id]=a;
  });
}
const A=id=>AUD[id];
function clearAudio(){
  Object.values(AUD).forEach(a=>a&&a.pause());
  stopAt=null; activeEl=null;
  const p=document.getElementById('player'); if(p)p.classList.remove('playing');
  document.querySelectorAll('.player.playing').forEach(b=>b.classList.remove('playing'));
  document.querySelectorAll('.segbtn.playing').forEach(b=>b.classList.remove('playing'));
  if(activeBtn){restore(activeBtn);activeBtn=null;}
}
function restore(b){ b.classList.remove('playing'); if(b.dataset.label)b.innerHTML=b.dataset.label; }
function arm(b,label){
  if(!b)return;
  if(!b.dataset.label)b.dataset.label=b.innerHTML;
  activeBtn=b; b.classList.add('playing');
  if(label)b.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg> '+label;
}
function playRange(el,from,to,btn,label){
  if(!el){toast('This lesson has no audio loaded.');return;}
  const was=btn&&btn.classList.contains('playing');
  clearAudio(); if(was)return;
  arm(btn,label);
  const p=document.getElementById('player'); if(p&&label)p.classList.add('playing');
  activeEl=el; el.currentTime=from; stopAt=to; el.play().catch(()=>toast('Could not play the recording.'));
}
let chain=null;
/* --- generic: any track, any named or numbered segment (Unit 7 onwards) ---
   CUR.SEGS = { trackId: {key:[from,to]} | [[from,to], ...] } */
function playN(track,key,btn,label){
  const el=A(track);
  if(!el){toast('This lesson has no audio loaded.');return;}
  const map=(CUR.SEGS||{})[track]; if(!map)return;
  const s=map[key]; if(!s)return;
  const box=btn&&btn.closest('.player');
  const was=btn&&btn.classList.contains('playing');
  playRange(el,s[0],s[1],btn,label||null);
  if(box&&!was)box.classList.add('playing');
}
/* --- lesson 1 shape: one track, eight numbered questions --- */
function playSeg(i,btn){ const s=CUR.SEG[i]; playRange(A('n13'),s[0],s[1],btn,null); }
function playAll(btn){
  const was=btn.classList.contains('playing');
  clearAudio(); if(chain){clearTimeout(chain);chain=null;} if(was)return;
  arm(btn,'Stop');
  const p=document.getElementById('player'); if(p)p.classList.add('playing');
  let i=0; const el=A('n13'); activeEl=el;
  const step=()=>{
    if(i>=CUR.SEG.length){clearAudio();return;}
    el.currentTime=CUR.SEG[i][0]; stopAt=null; el.play();
    chain=setTimeout(()=>{el.pause();i++;step();},(CUR.SEG[i][1]-CUR.SEG[i][0])*1000+380);
  };
  step();
}
function playFull(btn){ playRange(A('n13'),3.3,null,btn,'Stop'); }
/* --- lesson 2 shape: interview in parts, plus isolated sentences --- */
function playPart(key,btn){
  if(CUR.SEG17){ const s=CUR.SEG17[key]; return playRange(A('n17'),s[0],s[1],btn,'Stop'); }
  const s=CUR.SEG14[key]; playRange(A('n14'),s[0],s[1],btn,'Stop');
}
function playEx(key,btn){
  if(CUR.SEG17){ const s=CUR.SEG17[key]; return playRange(A('n17'),s[0],s[1],btn,null); }
  const s=CUR.SEG14[key]; playRange(A('n14'),s[0],s[1],btn,null);
}
/* --- generic shape (Unit 12+): any track, any named cue --- */
function playCue(id,key,btn,label){
  const t=CUR.CUES&&CUR.CUES[id]; const s=t&&t[key];
  if(!s){toast('This lesson has no cue for that.');return;}
  playRange(A(id),s[0],s[1],btn,label||null);
}
function playS15(i,btn){ const s=CUR.SEG15[i]; playRange(A('n15'),s[0],s[1],btn,null); }
/* --- lesson 3 shape: three speakers, plus nine isolated sentences --- */
function playS18(i,btn){ const s=CUR.SEG18[i]; playRange(A('n18'),s[0],s[1],btn,null); }

/* --- Unit 6 shapes: comparisons, the family quiz, the story, the news --- */
function play62(i,btn){ const g=CUR.SEG62[i]; playRange(A('n62'),g[0],g[1],btn,null); }
function play63(i,btn){ const g=CUR.SEG63[i]; playRange(A('n63'),g[0],g[1],btn,null); }
function playPeople(key,btn){ const g=CUR.SEG61[key]; playRange(A('n61'),g[0],g[1],btn,'Stop'); }
function play64(i,btn){ const g=CUR.SEG64[i]; playRange(A('n64'),g[0],g[1],btn,null); }
function play65(key,btn){ const g=CUR.SEG65[key]; playRange(A('n65'),g[0],g[1],btn,'Stop'); }
function play617(i,btn){ const g=CUR.SEG617[i]; playRange(A('n617'),g[0],g[1],btn,null); }
function playChunk(key,btn){ const g=CUR.SEG66[key]; playRange(A('n66'),g[0],g[1],btn,'Stop'); }
function play613(i,btn){ const g=CUR.SEG613[i]; playRange(A('n613'),g[0],g[1],btn,null); }
function play615(i,btn){ const g=CUR.SEG615[i]; playRange(A('n615'),g[0],g[1],btn,null); }
function play616(i,btn){ const g=CUR.SEG616[i]; playRange(A('n616'),g[0],g[1],btn,null); }
function playNews(i,btn){ const g=CUR.SEG614[i]; playRange(A('n614'),g[0],g[1],btn,'Stop'); }
/* --- Unit 5 shapes: possessions, word stress, the shop --- */
function playObj(key,btn){ const g=CUR.SEG51[key]; playRange(A('n51'),g[0],g[1],btn,'Stop'); }
function play52(i,btn){ const g=CUR.SEG52[i]; playRange(A('n52'),g[0],g[1],btn,null); }
function play53(i,btn){ const g=CUR.SEG53[i]; playRange(A('n53'),g[0],g[1],btn,null); }
function playDecl(key,btn){ const g=CUR.SEG54[key]; playRange(A('n54'),g[0],g[1],btn,'Stop'); }
function play58(i,btn){ const g=CUR.SEG58[i]; playRange(A('n58'),g[0],g[1],btn,null); }
function playShop(key,btn){ const g=CUR.SEG55[key]; playRange(A('n55'),g[0],g[1],btn,'Stop'); }
function play56(i,btn){ const g=CUR.SEG56[i]; playRange(A('n56'),g[0],g[1],btn,null); }
function play57(i,btn){ const g=CUR.SEG57[i]; playRange(A('n57'),g[0],g[1],btn,null); }
function play59(btn){ const g=CUR.SEG59.full; playRange(A('n59'),g[0],g[1],btn,null); }
/* --- unit 8 shape: named segments per track, CUR.SEGS[track][name]=[from,to] --- */
function playU(key,name,btn,label){
  const m=(CUR.SEGS||{})[key];
  if(!m||!m[name]){toast('This clip is not available.');return;}
  const s=m[name];
  playRange(A(key),s[0],(s[1]===null?null:s[1]),btn,typeof label==='string'?label:(label?'Stop':null));
}
/* --- Unit 10 shapes ------------------------------------------------ */
function playFood(key,btn){ const s=CUR.SEG101[key==='all'?'sacher':key];
  if(key==='all'){ return playRange(A('a101'),3.40,null,btn,'Stop'); }
  playRange(A('a101'),s[0],s[1],btn,null); }
function playCan(key,btn){ const s=CUR.SEG104[key==='full'?'p1':key];
  if(key==='full'){ return playRange(A('a104'),3.40,121.95,btn,'Stop'); }
  playRange(A('a104'),s[0],s[1],btn,null); }
function playWaste(key,btn){ if(key==='full') return playRange(A('a105'),2.75,70.85,btn,'Stop');
  const s=CUR.SEG105[key]; playRange(A('a105'),s[0],s[1],btn,null); }
function playComp(key,btn){ if(key==='full') return playRange(A('a106'),3.45,155.10,btn,'Stop');
  const s=CUR.SEG106[key]; playRange(A('a106'),s[0],s[1],btn,null); }
function playPhrase(i,btn){ const s=CUR.SEG107[i]; playRange(A('a107'),s[0],s[1],btn,null); }
function playWord103(i,btn){ const s=CUR.SEG103[i]; playRange(A('a103'),s[0],s[1],btn,null); }
/* --- the grammar slider, whichever shape the lesson uses --- */
function playSlide(btn){
  if(CUR.SLIDE_CUES){ const [id,key]=CUR.SLIDE_CUES[si]; return playCue(id,key,btn); }
  if(CUR.SLIDE_SRC101){ const k=CUR.SLIDE_SRC101[si];
    if(!k){ toast('This sentence is written for the course - there is no recording.'); return; }
    const s=CUR.SEG101[k]; return playRange(A('a101'),s[0],s[1],btn,null); }
  if(CUR.SLIDE_104){ const s=CUR.SEG104[CUR.SLIDE_104[si]]; return playRange(A('a104'),s[0],s[1],btn,null); }
  if(CUR.SLIDE_107){ const s=CUR.SEG107[CUR.SLIDE_107[si]]; return playRange(A('a107'),s[0],s[1],btn,null); }
  if(CUR.SLIDE_CLIPS){ return playClip(CUR.SLIDE_CLIPS[si],btn); }
  if(CUR.SLIDE_GEN){ const [tid,keys]=CUR.SLIDE_GEN; return playN(tid,keys[si],btn,null); }
  if(CUR.SLIDE_62){ const g=CUR.SEG62[CUR.SLIDE_62[si]]; return playRange(A('n62'),g[0],g[1],btn,null); }
  if(CUR.SLIDE_AUD){ const r=CUR.SLIDE_AUD[si];
    if(!r){ toast('This example has no recording.'); return; }
    return playRange(A('n66'),r[0],r[1],btn,null); }
  if(CUR.SLIDE_U){ const [k,n]=CUR.SLIDE_U[si]; return playU(k,n,btn,null); }
  if(CUR.SLIDE_18){ const s=CUR.SEG18[CUR.SLIDE_18[si]]; return playRange(A('n18'),s[0],s[1],btn,null); }
  if(CUR.SLIDE_Q){ const s=CUR.SEG[CUR.SLIDE_Q[si]]; playRange(A('n13'),s[0],s[1],btn,null); }
  else { const [src,key]=CUR.SLIDE_SRC[si];
    if(src==='n14'){const s=CUR.SEG14[key]; playRange(A('n14'),s[0],s[1],btn,null);}
    else {const s=CUR.SEG15[key]; playRange(A('n15'),s[0],s[1],btn,null);} }
}
/* --- Unit 3 onwards: generic named clips, CUR.SEGS = {key:[trackId,from,to]} --- */
function playClip(key,btn,label){
  const c=(CUR.SEGS||{})[key];
  if(!c){toast('Clip not found: '+key);return;}
  playRange(A(c[0]),c[1],c[2],btn,label||null);
}

function buildSegList(){
  document.querySelectorAll('.wave').forEach(w=>{
    if(!w.children.length) for(let i=0;i<34;i++){const b=document.createElement('i');b.style.animationDelay=(i*0.045)+'s';w.appendChild(b);}
  });
  const el=document.getElementById('seglist'); if(!el)return;
  el.innerHTML='';
  const play='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> ';
  if(CUR.segbuild==='questions'){
    CUR.QS.forEach((q,i)=>{
      const b=document.createElement('button'); b.className='segbtn'; b.type='button';
      b.innerHTML=play+(i+1); b.title=q; b.onclick=()=>playSeg(i,b); el.appendChild(b);
    });
  } else if(CUR.segbuild==='speakers'){
    [['faisal','Faisal, Dubai'],['marek','Marek, Alberta'],['gina','Gina, Rio de Janeiro']]
      .forEach(([k,label],i)=>{
        const b=document.createElement('button'); b.className='segbtn'; b.type='button';
        b.innerHTML=play+(i+1)+' \u00b7 '+label; b.onclick=()=>playEx(k,b); el.appendChild(b);
      });
  } else if(CUR.segbuild==='people'){
    [['max','1 \u00b7 Max, the flatmate'],['lena','2 \u00b7 Lena, the sister'],['nico','3 \u00b7 Nico, the partner']]
      .forEach(([k,label])=>{
        const b=document.createElement('button'); b.className='segbtn'; b.type='button';
        b.innerHTML=play+label; b.onclick=()=>playPeople(k,b); el.appendChild(b);
      });
  } else if(CUR.segbuild==='story'){
    [['c1','Part 1 \u00b7 the train'],['c2','Part 2 \u00b7 Kolkata'],['c3','Part 3 \u00b7 Tasmania'],['c4','Part 4 \u00b7 the search']]
      .forEach(([k,label])=>{
        const b=document.createElement('button'); b.className='segbtn'; b.type='button';
        b.innerHTML=play+label; b.onclick=()=>playChunk(k,b); el.appendChild(b);
      });
  } else if(CUR.segbuild==='objects'){
    [['sandra','1 \u00b7 Sandra'],['omar','2 \u00b7 Omar'],['helena','3 \u00b7 Helena'],['marcus','4 \u00b7 Marcus']]
      .forEach(([k,label])=>{
        const b=document.createElement('button'); b.className='segbtn'; b.type='button';
        b.innerHTML=play+label; b.onclick=()=>playObj(k,b); el.appendChild(b);
      });
  } else if(CUR.segbuild==='shop'){
    [['c1','Conversation 1'],['c2','Conversation 2'],['c3','Conversation 3']]
      .forEach(([k,label])=>{
        const b=document.createElement('button'); b.className='segbtn'; b.type='button';
        b.innerHTML=play+label; b.onclick=()=>playShop(k,b); el.appendChild(b);
      });
  } else if(CUR.segbuild==='news'){
    ['1','2','3','4','5'].forEach((label,i)=>{
      const b=document.createElement('button'); b.className='segbtn'; b.type='button';
      b.innerHTML=play+'Conversation '+label; b.onclick=()=>playNews(i,b); el.appendChild(b);
    });
  } else if(CUR.segbuild==='u8'){
    (CUR.SEGLIST||[]).forEach(([k,n,label],i)=>{
      const b=document.createElement('button'); b.className='segbtn'; b.type='button';
      b.innerHTML=play+(i+1)+(label?' \u00b7 '+label:''); b.onclick=()=>playU(k,n,b); el.appendChild(b);
    });
  } else if(CUR.segbuild==='foods'){
    [['sacher','1 \u00b7 Sacher Torte'],['tagine','2 \u00b7 Tagine'],['rolls','3 \u00b7 Spring rolls'],['scones','4 \u00b7 Scones']]
      .forEach(([k,label])=>{
        const b=document.createElement('button'); b.className='segbtn'; b.type='button';
        b.innerHTML=play+label; b.onclick=()=>playFood(k,b); el.appendChild(b);
      });
    const el2=document.getElementById('seglist2');
    if(el2){ el2.innerHTML='';
      ['vegetable','strawberry','raspberry','favourite','different','temperature','several'].forEach((w,i)=>{
        const b=document.createElement('button'); b.className='segbtn'; b.type='button';
        b.innerHTML=play+w; b.onclick=()=>playWord103(i,b); el2.appendChild(b);
      }); }
  } else if(CUR.segbuild==='cans'){
    [['p1','1 \u00b7 Before the can'],['p2','2 \u00b7 1810, and the prize'],['p3','3 \u00b7 By hand, then by machine'],['p4','4 \u00b7 Today']]
      .forEach(([k,label])=>{
        const b=document.createElement('button'); b.className='segbtn'; b.type='button';
        b.innerHTML=play+label; b.onclick=()=>playCan(k,b); el.appendChild(b);
      });
  } else if(CUR.segbuild==='complaints'){
    [['d1','1 \u00b7 The spilt juice'],['d2','2 \u00b7 The bill'],['d3','3 \u00b7 The glass'],['d4','4 \u00b7 No cash'],['d5','5 \u00b7 The fish']]
      .forEach(([k,label])=>{
        const b=document.createElement('button'); b.className='segbtn'; b.type='button';
        b.innerHTML=play+label; b.onclick=()=>playComp(k,b); el.appendChild(b);
      });
    const el2=document.getElementById('seglist2');
    if(el2){ el2.innerHTML='';
      for(let i=0;i<10;i++){
        const b=document.createElement('button'); b.className='segbtn'; b.type='button';
        b.innerHTML=play+(i+1); b.onclick=()=>playPhrase(i,b); el2.appendChild(b);
      } }
  } else if(CUR.segbuild==='cues'){
    (CUR.SEGLIST||[]).forEach(([id,key,label])=>{
      const b=document.createElement('button'); b.className='segbtn'; b.type='button';
      b.innerHTML=play+label; b.onclick=()=>playCue(id,key,b); el.appendChild(b);
    });
  } else if(CUR.SEGLIST){
    CUR.SEGLIST.forEach(([tr,key,label])=>{
      const b=document.createElement('button'); b.className='segbtn'; b.type='button';
      b.innerHTML=play+label; b.onclick=()=>playU(tr,key,b); el.appendChild(b);
    });
  } else {
    [['howoften','How often does he run?'],['sports','Any other sports?'],['thinks','Does he think about work?']]
      .forEach(([k,label],i)=>{
        const b=document.createElement('button'); b.className='segbtn'; b.type='button';
        b.innerHTML=play+(i+1)+' \u00b7 '+label; b.onclick=()=>playEx(k,b); el.appendChild(b);
      });
  }
  const wave=document.getElementById('wave');
  if(wave&&!wave.children.length) for(let i=0;i<34;i++){const b=document.createElement('i');b.style.animationDelay=(i*0.045)+'s';wave.appendChild(b);}
}
function togglePattern(btn){
  const on=JCROOT().classList.toggle('pattern-on');
  btn.textContent=on?'Hide the pattern':'Show the pattern';
}

/* ======================= CHECKING ======================= */
/* ======================= CHECKING ======================= */
const norm=s=>(s||'')
  .toLowerCase()
  .replace(/[\u2018\u2019\u02bc\u00b4`']/g,'')    /* apostrophes: dont == don't */
  .replace(/[\u2010-\u2015\u2212]/g,'-')          /* dashes -> hyphen */
  .replace(/[.,!?;:"\u201c\u201d\u2026()\[\]{}\/\\|<>*_+=~^&%$#@]/g,' ')  /* drop punctuation entirely */
  .replace(/\s*-\s*/g,' ')                        /* hyphen counts as a space */
  .replace(/\s+/g,' ')
  .trim()
  .replace(/\b(dont|doesnt|didnt|isnt|arent|wasnt|werent|havent|hasnt|hadnt|wont|wouldnt|shouldnt|couldnt|mustnt|cant|cannot|im|ive|youre|youve|weve|were(?=\s+going)|theyre|theyve|thats|theres|heres|lets)\b/g,
    m=>CONTRACT[m]||m);
/* G7 - a rewrite is right whether the student writes the contraction or the
   full form, so both collapse to the same string before they are compared. */
const CONTRACT={dont:'do not',doesnt:'does not',didnt:'did not',isnt:'is not',arent:'are not',
  wasnt:'was not',werent:'were not',havent:'have not',hasnt:'has not',hadnt:'had not',
  wont:'will not',wouldnt:'would not',shouldnt:'should not',couldnt:'could not',mustnt:'must not',
  cant:'can not',cannot:'can not',im:'i am',ive:'i have',youre:'you are',youve:'you have',
  weve:'we have',theyre:'they are',theyve:'they have',thats:'that is',theres:'there is',
  heres:'here is',lets:'let us'};
/* An element counts only if every data-only ancestor matches the active mode.
   Derived from mode, not from layout, so it is reliable before first paint. */
function visible(el){
  let n=el;
  while(n&&n!==document.body){
    if(n.hasAttribute&&n.hasAttribute('data-only')){
      if(!n.getAttribute('data-only').split(/\s+/).includes(mode))return false;
    }
    n=n.parentElement;
  }
  return true;
}

/* G7 - "Write the sentence again" puts the input at the end of the line, so the
   student types the whole remainder while data-answer often holds only the first
   few words. An answer is also correct when it STARTS with an accepted wording
   and every extra word comes from the prompt sentence itself - which lets the
   full sentence through without letting an invented ending through. */
function extendsAnswer(f,v,ans){
  const cue=f.dataset.cue;
  if(!cue)return false;
  const pool=cue.split(' ').filter(Boolean);
  return ans.some(a=>{
    if(!a||a.length<2||!v.startsWith(a+' '))return false;
    const extra=v.slice(a.length).trim().split(' ').filter(Boolean);
    return extra.length>0 && extra.every(w=>pool.indexOf(w)>=0);
  });
}
function captureCues(){
  document.querySelectorAll('input[data-answer]').forEach(f=>{
    if(f.dataset.cue!==undefined)return;
    const row=f.closest('.row')||f.parentNode;
    const clone=row.cloneNode(true);
    clone.querySelectorAll('input,select,textarea,.rev,.why,.donebar,button').forEach(x=>x.remove());
    f.dataset.cue=norm(clone.textContent||'');
  });
}
function check(btn){
  const t=btn.closest('.task'); let total=0,right=0;
  t.querySelectorAll('[data-answer]').forEach(f=>{
    if(!visible(f))return; total++;
    const ans=f.getAttribute('data-answer').split('|').map(norm), v=norm(f.value);
    f.classList.remove('ok','no');
    if(v&&(ans.includes(v)||extendsAnswer(f,v,ans))){right++;f.classList.add('ok');}
    else{
      f.classList.add('no');
      let r=f.parentNode.querySelector('.rev');
      if(!r){r=document.createElement('span');r.className='rev';f.after(r);}
      r.textContent=' ✓ '+f.getAttribute('data-answer').split('|')[0]; r.classList.add('show');
      const why=f.getAttribute('data-why');
      if(why&&mode==='self'){
        const row=f.closest('.row')||f.parentNode;
        let wb=row.querySelector('.why');
        if(!wb){wb=document.createElement('div');wb.className='why';row.appendChild(wb);}
        wb.innerHTML=why;
      }
    }
  });
  t.querySelectorAll('.opts[data-correct]').forEach(g=>{
    if(!visible(g))return; total++;
    const c=g.getAttribute('data-correct');
    g.querySelectorAll('.opt').forEach(o=>o.classList.remove('mk-ok','mk-no'));
    const s=g.querySelector('.opt.sel');
    if(s&&s.getAttribute('data-val')===c){right++;s.classList.add('mk-ok');}
    else{ if(s)s.classList.add('mk-no'); const w=g.querySelector('.opt[data-val="'+c+'"]'); if(w)w.classList.add('mk-ok'); }
  });
  /* multi-select groups score as one item: the whole set must match */
  t.querySelectorAll('.opts[data-multi]').forEach(g=>{
    if(!visible(g))return; total++;
    const want=g.getAttribute('data-multi').split(',');
    const got=[...g.querySelectorAll('.opt.sel')].map(o=>o.dataset.val);
    g.querySelectorAll('.opt').forEach(o=>{
      o.classList.remove('mk-ok','mk-no');
      if(want.includes(o.dataset.val))o.classList.add('mk-ok');
      else if(o.classList.contains('sel'))o.classList.add('mk-no');
    });
    if(got.length===want.length&&want.every(v=>got.includes(v)))right++;
  });
  /* click-the-error: one item per sentence */
  t.querySelectorAll('.errline').forEach(line=>{
    if(!visible(line))return; total++;
    const want=line.dataset.err, got=line.dataset.pick||'';
    line.querySelectorAll('.ew').forEach(x=>x.classList.remove('mk-ok','mk-no','showans'));
    if(got===want){right++; const g=line.querySelector('.ew[data-i="'+want+'"]'); if(g)g.classList.add('mk-ok');}
    else{
      const bad=line.querySelector('.ew.picked'); if(bad)bad.classList.add('mk-no');
      const good=line.querySelector('.ew[data-i="'+want+'"]'); if(good)good.classList.add('showans');
      const why=line.dataset.why;
      if(why&&mode==='self'){
        const row=line.closest('.row')||line.parentNode;
        let wb=row.querySelector('.why');
        if(!wb){wb=document.createElement('div');wb.className='why';row.appendChild(wb);}
        wb.innerHTML=why;
      }
    }
  });
  /* adverb slots: one item per sentence */
  t.querySelectorAll('.slotline').forEach(line=>{
    if(!visible(line))return; total++;
    /* data-slot may list more than one correct position, e.g. "1,4" - a time
       expression that works at the front and at the end is right in both. */
    const wants=String(line.dataset.slot).split(',').map(x=>x.trim()).filter(Boolean);
    const want=wants[0], got=line.dataset.pick||'';
    line.querySelectorAll('.sl').forEach(s=>s.classList.remove('mk-ok','mk-no','showans'));
    if(wants.indexOf(got)>=0){right++; const s=line.querySelector('.sl[data-s="'+got+'"]'); if(s)s.classList.add('mk-ok');}
    else{
      const bad=line.querySelector('.sl.chosen'); if(bad)bad.classList.add('mk-no');
      const good=line.querySelector('.sl[data-s="'+want+'"]');
      if(good){good.classList.add('showans'); if(!good.classList.contains('chosen'))good.textContent=line.querySelector('.slotchip').textContent;}
      const why=line.dataset.why;
      if(why&&mode==='self'){
        const row=line.closest('.row')||line.parentNode;
        let wb=row.querySelector('.why');
        if(!wb){wb=document.createElement('div');wb.className='why';row.appendChild(wb);}
        wb.innerHTML=why;
      }
    }
  });
  /* picture matching: every cell is one item */
  t.querySelectorAll('[data-pics]').forEach(g=>{
    if(!visible(g))return;
    g.querySelectorAll('.pic').forEach(c=>{
      total++; c.classList.remove('mk-ok','mk-no');
      if(c.dataset.placed===c.dataset.w){right++;c.classList.add('mk-ok');}
      else{c.classList.add('mk-no');c.querySelector('.lab').textContent=c.dataset.w;}
    });
  });
  /* ordering: the whole sequence must match */
  t.querySelectorAll('.order[data-order]').forEach(g=>{
    if(!visible(g))return; total++;
    const want=g.getAttribute('data-order').split(',');
    const got=[...g.querySelectorAll('.ochip')].filter(c=>c.dataset.pick)
      .sort((a,b)=>a.dataset.pick-b.dataset.pick).map(c=>c.dataset.val);
    let all=got.length===want.length;
    g.querySelectorAll('.ochip').forEach(c=>{
      c.classList.remove('mk-ok','mk-no');
      const idx=want.indexOf(c.dataset.val)+1;
      if(String(idx)===c.dataset.pick)c.classList.add('mk-ok');
      else{c.classList.add('mk-no');all=false;}
      c.querySelector('.pin').textContent=idx;
    });
    if(all)right++;
  });

  const st=btn.closest('.stage'); if(st)errByStage.set(st.dataset.stage,(errByStage.get(st.dataset.stage)||0)+(total-right));
  if(t.dataset.tid)markDone(t.dataset.tid, right+'/'+total);
  const r=t.querySelector('.res');
  r.className='res show '+(right===total?'pass':'part');
  r.textContent = right===total ? `All correct — ${right}/${total}` : `${right}/${total} correct. The right answers are in green.`;
  taskScores.set(t,[right,total]);
  updateScore();
}

function updateScore(){
  let r=0,tt=0;
  document.querySelectorAll('.task').forEach(t=>{
    if(!visible(t))return;
    const s=taskScores.get(t); if(s){r+=s[0];tt+=s[1];}
  });
}

/* ======================= SLIDER ======================= */
let slideEl=null, dotsEl=null;
function buildSlider(){
  slideEl=document.getElementById('slide'); dotsEl=document.getElementById('dots');
  if(!slideEl||!dotsEl)return;
  si=0; dotsEl.innerHTML='';
  SLIDES.forEach((_,i)=>{const d=document.createElement('i'); if(!i)d.className='on'; dotsEl.appendChild(d);});
  renderSlide();
}
function renderSlide(){
  if(!slideEl)return;
  slideEl.innerHTML=SLIDES[si];
  [...dotsEl.children].forEach((d,i)=>d.classList.toggle('on',i===si));
  const sb=document.getElementById('slideBtn');
  if(sb&&CUR&&CUR.SLIDE_AUD) sb.style.display = CUR.SLIDE_AUD[si] ? '' : 'none';
}
function slide(n){ si=(si+n+SLIDES.length)%SLIDES.length; renderSlide(); }

/* ======================= VOCABULARY ======================= */
/* =====================================================================
   VOCABULARY FLASHCARDS
   Front: picture + the English word only.  Back: word, pronunciation,
   English definition, KZ + RU, the example sentence, collocations and
   a one-tap save into My Dictionary.  Same component as the deck in
   My Dictionary, so the two never drift apart.
   ===================================================================== */
function fcFaces(en,pos,ru,kz,def,ex,col,img,opts){
  opts=opts||{};
  const d=DICT[en]||null;
  const ipa = d?d[0]:'';
  const definition = def || (d?d[1]:'');
  const example = ex || (d&&d[4]?'<b>'+en+'</b> &mdash; '+d[4]:'');
  const esc = en.replace(/'/g,"\\'");
  const saved = (typeof has==='function') && has(en);
  const sub = [pos||'', ipa?'/'+ipa+'/':''].filter(Boolean).join(' &middot; ');
  return `<div class="fc-inner">
    <div class="fc-face fc-front">
      ${img?`<img class="fc-img" src="${img}" alt="" loading="lazy">`
           :`<div class="fc-noimg">${en.charAt(0).toUpperCase()}</div>`}
      <div class="fc-scrim"></div>
      <span class="fc-flip">&#8635;</span>
      <div class="fc-frontbody">
        <div class="fc-word">${en}</div>
        ${sub?`<div class="fc-sub">${sub}</div>`:''}
        ${(ru||kz)?`<div class="fc-tr">RU ${ru||'&mdash;'} &nbsp;&middot;&nbsp; KZ ${kz||'&mdash;'}</div>`:''}
      </div>
    </div>
    <div class="fc-face fc-back">
      <div class="fc-bhead">
        <span><span class="fc-w">${en}</span>${sub?`<span class="fc-sub2">${sub}</span>`:''}</span>
        <span class="pspk" role="button" tabindex="0" title="Pronunciation"
          onclick="event.stopPropagation();sayWord('${esc}')">&#128266;</span>
      </div>
      <div class="fc-bbody">
        ${definition?`<div class="fc-def">${definition}</div>`:''}
        ${(kz||ru)?`<div class="fc-tls">
          ${kz?`<div class="fc-tl"><b>KZ</b><span>${kz}</span></div>`:''}
          ${ru?`<div class="fc-tl"><b>RU</b><span>${ru}</span></div>`:''}
        </div>`:''}
        ${example?`<div class="fc-ex">${example}</div>`:''}
        ${col?`<div class="fc-col">${col}</div>`:''}
      </div>
      ${opts.add===false?'':`<button class="fc-add${saved?' added':''}" onclick="event.stopPropagation();cardAdd('${esc}',this)">
        ${saved?'\u2713 In My Dictionary':'+ Add to My Dictionary'}</button>`}
    </div>
  </div>`;
}
function flipTile(el){ el.classList.toggle('flip'); }

function cardAdd(w,btn){
  if(has(w)){ removeWord(w); btn.classList.remove('added'); btn.innerHTML='+ Add to My Dictionary'; }
  else if(addWord(w)){ btn.classList.add('added'); btn.innerHTML='\u2713 In My Dictionary'; }
  syncAddButtons();
}
function syncAddButtons(){
  document.querySelectorAll('.fc-add[data-w]').forEach(b=>{
    const on=has(b.dataset.w);
    b.classList.toggle('added',on);
    b.innerHTML=on?'\u2713 In My Dictionary':'+ Add to My Dictionary';
  });
}

function buildVocab(){
  const wordsEl=document.getElementById('words'); if(!wordsEl)return;
  wordsEl.innerHTML='';
  VOCAB.forEach(([en,pos,ru,kz,def])=>{
    const b=document.createElement('div');
    b.className='fcard'; b.setAttribute('role','button'); b.tabIndex=0;
    b.setAttribute('aria-label',en+' \u2014 tap to see the meaning');
    b.innerHTML=fcFaces(en,pos,ru,kz,def,CTX[en]||'',COLLOC[en]||'',IMG[en]||IMGX[en]||'');
    b.addEventListener('click',()=>flipTile(b));
    b.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();flipTile(b);} });
    const add=b.querySelector('.fc-add'); if(add)add.dataset.w=en;
    wordsEl.appendChild(b);
  });
  const tog=document.getElementById('trToggle');
  if(tog){
    tog.checked=JCROOT().classList.contains('tr-on');
    tog.onchange=e=>JCROOT().classList.toggle('tr-on',e.target.checked);
  }
}
function fill(id,pairs){
  const box=document.getElementById(id); if(!box)return;
  const sh=[...pairs].sort(()=>Math.random()-.5);
  box.querySelectorAll('select').forEach(s=>{
    sh.forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;s.appendChild(o);});
  });
}

/* ======================= INTERACTION BINDING ======================= */
let heldWord=null;
function bindAll(){
  captureCues();
  document.querySelectorAll('.opts').forEach(g=>{
    const multi=g.hasAttribute('data-multi');
    g.querySelectorAll('.opt').forEach(b=>b.addEventListener('click',()=>{
      if(multi){b.classList.toggle('sel');}
      else{g.querySelectorAll('.opt').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');}
    }));
  });
  document.querySelectorAll('.errline').forEach(line=>{
    [...line.querySelectorAll('.ew')].forEach((wsp,i)=>{
      wsp.dataset.i=i+1;
      wsp.addEventListener('click',()=>{
        if(wsp.classList.contains('picked')){wsp.classList.remove('picked');line.dataset.pick='';return;}
        line.querySelectorAll('.ew').forEach(x=>x.classList.remove('picked','mk-ok','mk-no','showans'));
        wsp.classList.add('picked'); line.dataset.pick=wsp.dataset.i;
      });
    });
  });
  document.querySelectorAll('.slotline').forEach(line=>{
    const word=line.querySelector('.slotchip').textContent;
    line.querySelectorAll('.sl').forEach(s=>s.addEventListener('click',()=>{
      if(s.classList.contains('chosen')){s.classList.remove('chosen');s.textContent='';line.dataset.pick='';return;}
      line.querySelectorAll('.sl').forEach(x=>{x.classList.remove('chosen','mk-ok','mk-no','showans');x.textContent='';});
      s.classList.add('chosen'); s.textContent=word; line.dataset.pick=s.dataset.s;
    }));
  });
  document.querySelectorAll('.order').forEach(g=>{
    g.querySelectorAll('.ochip').forEach(c=>c.addEventListener('click',()=>{
      if(c.dataset.pick){
        const n=+c.dataset.pick; delete c.dataset.pick;
        c.classList.remove('picked'); c.querySelector('.pin').textContent='';
        g.querySelectorAll('.ochip').forEach(o=>{
          if(o.dataset.pick&&+o.dataset.pick>n){o.dataset.pick=+o.dataset.pick-1;o.querySelector('.pin').textContent=o.dataset.pick;}
        });
      } else {
        const n=g.querySelectorAll('.ochip[data-pick]').length+1;
        c.dataset.pick=n; c.classList.add('picked'); c.querySelector('.pin').textContent=n;
      }
    }));
  });
  document.querySelectorAll('#can li').forEach(li=>li.onclick=()=>li.classList.toggle('got'));
}

/* ---- match the word to the picture (built from IMG) ---- */
/* every word that has an illustration */


/* the pairs learners actually confuse in this lesson:
   housework / homework  ·  indoors / outdoors  ·  early / late  ·  gym / running */

function buildPicTask(){
  const slot=document.getElementById('picTaskSlot'); if(!slot)return;
  const pick=PICTASK.filter(w=>IMG[w]);
  if(pick.length<4){slot.innerHTML='';return;}
  const bank=pick.slice().sort(()=>Math.random()-.5);
  const cells=pick.slice().sort(()=>Math.random()-.5);
  slot.innerHTML=`
    <div class="instruction" data-t="t211">2 &middot; Match the word to the picture.</div>
    <p class="subline" data-t="t212">Click a word, then click the picture it belongs to. Look carefully &mdash; some pairs are close.</p>
    <div class="task" data-task data-tid="voc-picture">
      <div class="wordbank">${bank.map(w=>
        `<button class="wchip" data-w="${w}" onclick="pickWord(this)">${w}</button>`).join('')}</div>
      <div class="picgrid" data-pics>${cells.map(w=>
        `<button class="pic" data-w="${w}" onclick="dropWord(this)"><img src="${IMG[w]}" alt="" loading="lazy"><span class="lab"></span></button>`).join('')}</div>
      <button class="btn btn-primary" onclick="check(this)">Check answers</button>
      <div class="res"></div>
    </div>`;
  if(lang)setLang(lang);
  if(typeof paintDone==='function')paintDone();
}

function pickWord(btn){
  document.querySelectorAll('.wchip').forEach(c=>c.classList.remove('on'));
  btn.classList.add('on'); heldWord=btn.dataset.w;
}
function dropWord(cell){
  if(cell.dataset.placed){
    const back=document.querySelector('.wchip[data-w="'+cell.dataset.placed+'"]');
    if(back)back.classList.remove('used');
    delete cell.dataset.placed; cell.querySelector('.lab').textContent='';
    cell.classList.remove('picked','mk-ok','mk-no'); return;
  }
  if(!heldWord)return;
  cell.dataset.placed=heldWord; cell.querySelector('.lab').textContent=heldWord;
  cell.classList.add('picked');
  const chip=document.querySelector('.wchip[data-w="'+heldWord+'"]');
  if(chip){chip.classList.add('used');chip.classList.remove('on');}
  heldWord=null;
}

/* ---- end-of-lesson feedback (self-study) ---- */
function buildSummary(){
  const el=document.getElementById('summary'); if(!el)return;
  let r=0,t=0;
  document.querySelectorAll('.task').forEach(x=>{const s=taskScores.get(x); if(s&&visible(x)){r+=s[0];t+=s[1];}});
  if(!t){el.innerHTML='';return;}
  const weak=[...errByStage.entries()].filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
  const pct=Math.round(r/t*100);
  el.innerHTML=`<div class="bubble" style="margin-top:22px">
    <div class="blab">How you did</div>
    <p>You answered <b>${r} of ${t}</b> checked items correctly (${pct}%).</p>
    ${weak.length
      ? `<p>Worth another look before Lesson 2: <b>${weak.map(([s,n])=>s+' ('+n+')').join(', ')}</b>. Go back to those stages and press Check again &mdash; the reason for each answer is shown under it.</p>`
      : `<p>Nothing left to review here. Take your saved words into the flashcards, then start Lesson 2.</p>`}
  </div>`;
}

/* ======================= COMPLETION (per lesson, shared by modes) ======================= */
const CKEY='jts_preint_course_done_v1';
let doneAll={};
try{const r=localStorage.getItem(CKEY); if(r)doneAll=JSON.parse(r);}catch(e){}
function saveDone(){ try{localStorage.setItem(CKEY,JSON.stringify(doneAll));}catch(e){} }
function bag(n){ return doneAll['L'+(n||lessonNo)] || (doneAll['L'+(n||lessonNo)]={}); }
const MODENAME={self:'Self-Study',solo:'1-to-1',group:'Group Study'};
function markDone(tid,score){ bag()[tid]={mode:mode,score:score||null,at:Date.now()}; saveDone(); paintDone(); railDone(); paintSidebar(); }
function clearDone(tid){ delete bag()[tid]; saveDone(); paintDone(); railDone(); paintSidebar(); }

/* G2 - "Do it again" has to put the task back to its untouched state, not just
   drop the completion record. Everything the checker drew is removed here:
   marks, revealed answers, explanations and the options picked last time. */
function resetTask(el){
  if(!el)return;
  /* G2 - every widget type has to go back to its untouched state: visual
     classes, the values the student typed or placed, the data attributes the
     checker reads, and the score this task contributed to the summary. */
  el.querySelectorAll('input,textarea').forEach(f=>{
    f.value=''; f.disabled=false;
    f.classList.remove('ok','no','mk-ok','mk-no');
  });
  el.querySelectorAll('select').forEach(f=>{
    f.selectedIndex=0; f.disabled=false;
    f.classList.remove('ok','no','mk-ok','mk-no');
  });
  el.querySelectorAll('.opt').forEach(o=>o.classList.remove('sel','mk-ok','mk-no','picked'));
  el.querySelectorAll('.opts').forEach(g=>{ delete g.dataset.done; });
  el.querySelectorAll('.ew').forEach(w=>w.classList.remove('picked','mk-ok','mk-no','showans'));
  el.querySelectorAll('.errline').forEach(l=>{ l.dataset.pick=''; });
  el.querySelectorAll('.slot').forEach(sl=>{
    sl.classList.remove('ok','no','filled','mk-ok','mk-no');
    if(sl.dataset.fill!==undefined) delete sl.dataset.fill;
    sl.textContent=sl.dataset.ph||sl.textContent;
  });
  el.querySelectorAll('.slotchip,.ochip').forEach(c=>c.classList.remove('used','sel','picked','mk-ok','mk-no'));
  /* ordering chips also carry the position they were given */
  el.querySelectorAll('.ochip').forEach(c=>{
    delete c.dataset.pick;
    const pin=c.querySelector('.pin'); if(pin)pin.textContent='';
  });
  el.querySelectorAll('.slotline').forEach(l=>{ l.dataset.pick=''; });
  /* adverb slots: the chosen slot was given the chip's word - take it back */
  el.querySelectorAll('.sl').forEach(sl=>{
    sl.classList.remove('chosen','mk-ok','mk-no','showans');
    sl.textContent='';
  });
  /* picture matching: the placed word, the label under it and the chip it came from */
  el.querySelectorAll('.pic').forEach(c=>{
    delete c.dataset.placed;
    c.classList.remove('picked','mk-ok','mk-no');
    const lab=c.querySelector('.lab'); if(lab)lab.textContent='';
  });
  el.querySelectorAll('.wchip').forEach(c=>c.classList.remove('used','on'));
  el.querySelectorAll('[data-pics]').forEach(g=>{ delete g.dataset.done; });
  el.querySelectorAll('.tsel').forEach(g=>{ delete g.dataset.done; });
  el.querySelectorAll('.order').forEach(o=>{ delete o.dataset.done; });
  el.querySelectorAll('.rev,.why').forEach(n=>n.remove());
  /* a word held in the hand from a previous attempt must not drop into the
     first cell the student touches after the reset */
  if(typeof heldWord!=='undefined') heldWord=null;
  /* the score this task put into the end-of-lesson summary goes with it */
  if(typeof taskScores!=='undefined' && taskScores.delete) taskScores.delete(el);
  const st=el.closest('.stage');
  if(st && typeof errByStage!=='undefined' && errByStage.delete) errByStage.delete(st.dataset.stage);
  const res=el.querySelector(':scope > .res'); if(res){res.className='res';res.innerHTML='';}
  el.classList.remove('done');
  if(typeof updateScore==='function')updateScore();
  if(typeof railDone==='function')railDone();
}
function againTask(tid,el){ resetTask(el); clearDone(tid); }
function allDone(n){
  const L=LESSONS[n]; if(!L)return false;
  const ids=[...L.html.matchAll(/data-tid="([^"]+)"/g)].map(m=>m[1]);
  const b=doneAll['L'+n]||{};
  return ids.length>0 && ids.every(t=>b[t]);
}
function paintDone(){
  const b=bag();
  document.querySelectorAll('[data-tid]').forEach(t=>{
    const tid=t.dataset.tid, rec=b[tid];
    let bar=t.querySelector(':scope > .donebar');
    if(!bar){
      bar=document.createElement('div'); bar.className='donebar';
      bar.innerHTML='<span class="tick2">\u2713</span><span class="txt"></span><button class="again" type="button">Do it again</button>';
      bar.querySelector('.again').onclick=()=>againTask(tid,t);
      t.prepend(bar);
    }
    t.classList.toggle('done', !!rec);
    if(rec) bar.querySelector('.txt').innerHTML='Completed'+(rec.score?' \u2014 '+rec.score:'')+
      ' <span class="who">in '+(MODENAME[rec.mode]||rec.mode)+'</span>';
  });
  document.querySelectorAll('[data-open]').forEach(t=>{
    if(t.querySelector(':scope > .markdone'))return;
    const btn=document.createElement('button');
    btn.type='button'; btn.className='btn btn-ghost markdone'; btn.textContent='Mark as done';
    btn.onclick=()=>markDone(t.dataset.tid,null);
    t.appendChild(btn);
  });
}
function railDone(){
  const b=bag();
  stages.forEach((s,i)=>{
    const seg=rail.children[i]; if(!seg)return;
    if(!seg.querySelector('.tickmark')){
      const m=document.createElement('span'); m.className='tickmark'; m.textContent='\u2713'; seg.appendChild(m);
    }
    const ts=[...s.querySelectorAll('[data-tid]')].filter(visible);
    seg.classList.toggle('allDone', ts.length>0 && ts.every(t=>b[t.dataset.tid]));
  });
}

/* =====================================================================
   TRANSLATION — instructions and grammar explanations only.
   Exercises, options, reading and listening content stay in English.
   ===================================================================== */
let lang=null;
/* G4 - the KZ / RU switch has to work on the assessments too, not only on
   lessons: their instruction lines carry data-t and now carry translations. */
function langAllowed(){
  return mode==='self' && (typeof lessonNo==='number' || /^R\d+$/.test(String(lessonNo)));
}
function paintLangButtons(){
  const on=langAllowed();
  ['lgKZ','lgRU'].forEach(id=>{ const b=document.getElementById(id); if(b)b.style.display=on?'':'none'; });
  if(!on && lang){ lang=null;
    document.querySelectorAll('.tx').forEach(x=>x.remove());
    ['lgKZ','lgRU'].forEach(id=>{ const b=document.getElementById(id); if(b)b.classList.remove('on'); });
  }
}
function setLang(l){
  if(!langAllowed())return;
  lang = (lang===l) ? null : l;
  document.getElementById('lgKZ').classList.toggle('on',lang==='kz');
  document.getElementById('lgRU').classList.toggle('on',lang==='ru');
  document.querySelectorAll('.tx').forEach(x=>x.remove());
  if(!lang)return;
  const i = lang==='ru' ? 0 : 1;
  document.querySelectorAll('[data-t]').forEach(el=>{
    const t=TR[el.dataset.t]; if(!t)return;
    const s=document.createElement('span'); s.className='tx'; s.textContent=t[i];
    el.appendChild(s);
  });
}

/* =====================================================================
   VOICE RECORDER
   One microphone stream for the whole page. Each speaking task keeps its
   own takes so the student can record, listen, record again and compare.
   Takes live in memory only - nothing is uploaded and nothing is stored.
   ===================================================================== */
let RSTREAM=null, RMR=null, RBOX=null, RCHUNKS=[], RTIMER=null, RT0=0, RPLAY=null;
const RMAX=3;

function REC_T(en,ru,kz){ return lang==='ru'?ru:(lang==='kz'?kz:en); }
function recSupported(){
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}
function recNote(box,msg,warn){
  const n=box.querySelector('.rec-note');
  if(n){ n.innerHTML=msg; n.classList.toggle('warn',!!warn); }
}
function recFmt(ms){
  const s=Math.max(0,Math.round(ms/1000));
  return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
}
function recTick(){
  if(!RBOX)return;
  const t=RBOX.querySelector('.rec-time'); if(t)t.textContent=recFmt(Date.now()-RT0);
}
function recStopPlayback(){
  if(RPLAY){ RPLAY.pause(); RPLAY=null; }
  document.querySelectorAll('.rec-take.playing').forEach(x=>x.classList.remove('playing'));
}

async function recToggle(btn){
  const box=btn.closest('.rec');
  if(RMR && RMR.state==='recording'){ RMR.stop(); return; }
  if(!recSupported()){
    recNote(box,REC_T('This browser cannot record audio. Chrome, Edge or Firefox will work.','Этот браузер не может записывать звук. Подойдут Chrome, Edge или Firefox.','Бұл браузер дыбыс жаза алмайды. Chrome, Edge немесе Firefox қолайлы.'),true); return;
  }
  recStopPlayback(); clearAudio();
  try{
    if(!RSTREAM || !RSTREAM.active) RSTREAM=await navigator.mediaDevices.getUserMedia({audio:true});
  }catch(e){
    recNote(box,REC_T('The microphone is not available. Allow microphone access in the browser and try again.','Микрофон недоступен. Разрешите доступ к микрофону в браузере и попробуйте снова.','Микрофон қолжетімсіз. Браузерде микрофонға рұқсат беріп, қайта көріңіз.'),true);
    return;
  }
  if(!box._takes) box._takes=[];
  if(box._takes.length>=RMAX){
    recNote(box,REC_T('Three takes is the maximum. Delete one before you record again.','Максимум три дубля. Удалите один, чтобы записать новый.','Ең көбі үш дубль. Жаңасын жазу үшін біреуін өшіріңіз.'),true); return;
  }
  RBOX=box; RCHUNKS=[];
  try{ RMR=new MediaRecorder(RSTREAM); }
  catch(e){ recNote(box,'This browser cannot record audio here.',true); return; }
  RMR.ondataavailable=e=>{ if(e.data && e.data.size) RCHUNKS.push(e.data); };
  RMR.onstop=()=>{
    const ms=Date.now()-RT0;
    box.classList.remove('on');
    clearInterval(RTIMER); RTIMER=null;
    const blob=new Blob(RCHUNKS,{type:(RMR&&RMR.mimeType)||'audio/webm'});
    if(blob.size>800 && ms>600){
      box._takes.push({url:URL.createObjectURL(blob), ms:ms});
      recRender(box);
      recNote(box, box._takes.length===1
        ? 'Listen to it. Then record a second take and try to say more, with fewer pauses.'
        : 'Play them one after the other. Which take is clearer?');
    }else{
      recNote(box,REC_T('That was too short to keep. Press the microphone and speak for at least a few seconds.','Слишком короткая запись. Нажмите на микрофон и говорите хотя бы несколько секунд.','Тым қысқа болды. Микрофонды басып, кемінде бірнеше секунд сөйлеңіз.'),true);
    }
    RMR=null; RBOX=null;
  };
  RMR.start();
  RT0=Date.now(); box.classList.add('on');
  const lb=box.querySelector('.rec-label b'); if(lb)lb.textContent='Recording\u2026 press again to stop';
  recTick(); RTIMER=setInterval(recTick,250);
  recNote(box,REC_T('Speak clearly. Press the microphone again when you have finished.','Говорите чётко. Закончив, нажмите на микрофон ещё раз.','Анық сөйлеңіз. Аяқтағанда микрофонды қайта басыңыз.'));
}

function recRender(box){
  const list=box.querySelector('.rec-takes'); if(!list)return;
  const takes=box._takes||[];
  const lb=box.querySelector('.rec-label b');
  if(lb)lb.textContent = takes.length ? 'Record another take' : 'Record your answer';
  const sub=box.querySelector('.rec-label span');
  if(sub)sub.textContent = takes.length ? takes.length+' of '+RMAX+' takes saved' : 'Press the microphone and speak';
  list.innerHTML=takes.map((t,i)=>`
    <div class="rec-take" data-i="${i}">
      <span class="tk">Take ${i+1}</span>
      <button class="play" type="button" title="Play" onclick="recPlay(this)">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
      <span class="dur">${recFmt(t.ms)}</span>
      <button class="del" type="button" title="Delete this take" onclick="recDel(this)">&times;</button>
    </div>`).join('');
}

function recPlay(btn){
  const row=btn.closest('.rec-take'), box=btn.closest('.rec');
  const t=(box._takes||[])[+row.dataset.i]; if(!t)return;
  if(row.classList.contains('playing')){ recStopPlayback(); return; }
  recStopPlayback(); clearAudio();
  RPLAY=new Audio(t.url);
  row.classList.add('playing');
  RPLAY.onended=()=>{ row.classList.remove('playing'); RPLAY=null; };
  RPLAY.play().catch(()=>{ row.classList.remove('playing'); recNote(box,'Could not play that take.',true); });
}

function recDel(btn){
  const row=btn.closest('.rec-take'), box=btn.closest('.rec');
  const i=+row.dataset.i, t=(box._takes||[])[i];
  recStopPlayback();
  if(t){ try{URL.revokeObjectURL(t.url);}catch(e){} box._takes.splice(i,1); }
  recRender(box);
  recNote(box, (box._takes||[]).length ? 'Take deleted.' : 'Take deleted. Record a new one when you are ready.');
}

/* release everything when the student leaves the lesson */
function recCleanup(){
  recStopPlayback();
  if(RMR && RMR.state==='recording'){ try{RMR.stop();}catch(e){} }
  RMR=null; RBOX=null; clearInterval(RTIMER); RTIMER=null;
  document.querySelectorAll('.rec').forEach(b=>{
    (b._takes||[]).forEach(t=>{ try{URL.revokeObjectURL(t.url);}catch(e){} });
    b._takes=[];
  });
}
function recBind(){
  document.querySelectorAll('.rec').forEach(b=>{ b._takes=[]; recRender(b); });
  if(!recSupported()){
    document.querySelectorAll('.rec').forEach(b=>
      recNote(b,'This browser cannot record audio. Chrome, Edge or Firefox will work.',true));
  }
}

/* =====================================================================
   MY DICTIONARY — store
   ===================================================================== */
/* One picture index for the whole course, so a word saved in Unit 2 still
   has its picture when it is revised in Unit 11. Only the key is stored in
   localStorage - never the image itself. */
const IMGX=window.__JC_IMGX||{};

const DKEY='jts_preint_course_dict_v1';
let store={words:[],pref:'ru'};
try{const raw=localStorage.getItem(DKEY); if(raw)store=JSON.parse(raw);}catch(e){}
function save(){ try{localStorage.setItem(DKEY,JSON.stringify(store));}catch(e){} }
function has(w){ return store.words.some(x=>x.w===w); }
function count(){ document.getElementById('dCount').textContent=store.words.length; }

function addWord(w){
  if(has(w))return false;
  const d=DICT[w];
  store.words.push({w:w, ipa:d?d[0]:'', def:d?d[1]:'', kz:d?d[2]:'', ru:d?d[3]:'', ex:d?d[4]:'',
    src:CUR?('Unit '+CUR.unit+' \u00b7 Lesson '+CUR.no):'Saved word',
    at:Date.now(), miss:0, box:0, due:0, seen:0});
  save(); count(); renderList(); syncAddButtons(); return true;
}
function removeWord(w){
  store.words=store.words.filter(x=>x.w!==w);
  save(); count(); renderList(); if(typeof syncAddButtons==='function')syncAddButtons();
  const tp=document.getElementById('pane-test');
  if(tp&&tp.classList.contains('on')) renderTest(); }

/* =====================================================================
   WORD LOOKUP — works on any lesson text, including inside tasks.
   It gives meaning only; it never says which option is correct.
   ===================================================================== */
const pop=document.getElementById('pop');
function lookupWord(raw,x,y){
  const w=raw.toLowerCase().replace(/[^a-z' -]/g,'').trim();
  if(!w||w.length<2)return hidePop();
  const d=DICT[w]||DICT[w.replace(/(ing|ed|es|s)$/,'')]||null;
  const key=DICT[w]?w:(DICT[w.replace(/(ing|ed|es|s)$/,'')]?w.replace(/(ing|ed|es|s)$/,''):w);
  const inD=has(key);
  pop.innerHTML = d ? `
    ${IMGX[key]?`<img class="pimg" src="${IMGX[key]}" alt="" loading="lazy">`:''}
    <div class="pw">${key}
      <button class="pspk" onclick="sayWord('${key}')" title="Pronunciation" aria-label="Pronunciation">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4 4 0 0 0-2-3.5v7a4 4 0 0 0 2-3.5z"/></svg>
      </button></div>
    <div class="ipa">/${d[0]}/</div>
    <div class="pdef">${d[1]}</div>
    <div class="ptr"><b>KZ</b><span>${d[2]}</span></div>
    <div class="ptr"><b>RU</b><span>${d[3]}</span></div>
    ${d[4]?`<div class="pex">${d[4]}</div>`:''}
    <button class="btn ${inD?'btn-primary padd added':'btn-primary padd'}" onclick="popAdd('${key}',this)">
      ${inD?'\u2713 In My Dictionary':'+ Add to My Dictionary'}</button>`
  : `<div class="pw">${key}</div>
     <div class="pnone">No entry for this word yet \u2014 you can still save it and add your own note later.</div>
     <button class="btn ${inD?'btn-primary padd added':'btn-primary padd'}" onclick="popAdd('${key}',this)">
       ${inD?'\u2713 In My Dictionary':'+ Add to My Dictionary'}</button>`;
  pop.classList.add('on');
  const pw=pop.offsetWidth, ph=pop.offsetHeight;
  let left=x-pw/2, top=y+12;
  left=Math.max(12,Math.min(left,window.innerWidth-pw-12));
  if(top+ph>window.scrollY+window.innerHeight) top=y-ph-24;
  pop.style.left=left+'px'; pop.style.top=top+'px';
}
function hidePop(){ pop.classList.remove('on'); }
function popAdd(w,btn){
  if(has(w)){ removeWord(w); btn.classList.remove('added'); btn.textContent='+ Add to My Dictionary'; }
  else if(addWord(w)){ btn.classList.add('added'); btn.textContent='\u2713 In My Dictionary'; }
}
/* Pronunciation aid. Set to false to remove synthetic speech completely —
   lesson listening always uses the real Navigate recording, never this. */
const PRONUNCIATION_AUDIO=true;
function sayWord(w){
  if(!PRONUNCIATION_AUDIO||!('speechSynthesis' in window))return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(w); u.lang='en-GB'; u.rate=.85; speechSynthesis.speak(u);
}

document.addEventListener('mouseup',e=>{
  if(pop.contains(e.target))return;
  /* Never open over a field the student is typing in - selecting the text you
     just typed must not drop a dictionary panel on top of your answer.
     Buttons and options are fine: you can still look a word up there. */
  if(e.target.closest('input, textarea, select'))return hidePop();
  const sel=window.getSelection();
  if(!sel||!sel.rangeCount)return hidePop();
  const t=sel.toString().trim();
  if(!t||t.split(/\s+/).length>2||t.length>28)return hidePop();
  if(!e.target.closest('.main, .reading, #drawer'))return hidePop();
  let r; try{ r=sel.getRangeAt(0).getBoundingClientRect(); }catch(err){ return hidePop(); }
  if(!r||(!r.width&&!r.bottom))return hidePop();
  lookupWord(t, r.left+r.width/2+window.scrollX, r.bottom+window.scrollY);
});

/* ---------------------------------------------------------------------
   TAP ANY WORD.  Selecting still works; a single tap is added for phones,
   where dragging a selection over one word is awkward. Anything the
   student can answer with - options, gaps, chips, cards - is left alone.
   ------------------------------------------------------------------- */
function wordAtPoint(x,y){
  let r=null;
  if(document.caretRangeFromPoint) r=document.caretRangeFromPoint(x,y);
  else if(document.caretPositionFromPoint){
    const p=document.caretPositionFromPoint(x,y);
    if(p){ r=document.createRange(); r.setStart(p.offsetNode,p.offset); r.collapse(true); }
  }
  if(!r||!r.startContainer||r.startContainer.nodeType!==3)return '';
  const t=r.startContainer.textContent||''; const i=r.startOffset;
  const isw=c=>/[A-Za-z'\u2019-]/.test(c||'');
  if(!isw(t.charAt(i))&&!isw(t.charAt(i-1)))return '';
  let a=i,b=i;
  while(a>0&&isw(t.charAt(a-1)))a--;
  while(b<t.length&&isw(t.charAt(b)))b++;
  const w=t.slice(a,b).replace(/^[-'\u2019]+|[-'\u2019]+$/g,'');
  return w.length>1?w:'';
}
const NOTAP='input,textarea,select,button,a,label,.opt,.ochip,.ew,.sl,.slotchip,.fcard,.segbtn,.dtab,.hb,.mi,.pspk,.wspk,.mode-btn,.les,.unit';
/* G1 - the card opens when the student SELECTS a word, never on a plain click.
   A stray click while reading must do nothing. Touch devices raise the same
   selection event after a long-press, so both input methods are covered. */
function selectedWord(){
  const sel=window.getSelection && window.getSelection();
  if(!sel)return '';
  const t=(sel.toString()||'').trim();
  if(!t || /\s/.test(t))return '';                 /* one word only */
  const w=t.replace(/^[^A-Za-z'\u2019-]+|[^A-Za-z'\u2019-]+$/g,'');
  return w.length>1 ? w : '';
}
function lookupFromSelection(e){
  const sel=window.getSelection && window.getSelection();
  if(!sel || !sel.rangeCount)return;
  const node=sel.anchorNode;
  const host=node && (node.nodeType===1?node:node.parentElement);
  if(!host || !host.closest('.main, .reading, #drawer'))return;
  if(host.closest('input,textarea,select'))return;
  const w=selectedWord();
  if(!w)return;
  let x=e?e.pageX:0, y=e?e.pageY:0;
  try{
    const r=sel.getRangeAt(0).getBoundingClientRect();
    if(r&&r.width){ x=r.left+r.width/2+window.scrollX; y=r.bottom+window.scrollY; }
  }catch(err){}
  lookupWord(w,x,y);
}
document.addEventListener('mouseup',e=>{ if(pop.contains(e.target))return; setTimeout(()=>lookupFromSelection(e),0); });
document.addEventListener('touchend',e=>{ if(pop.contains(e.target))return; setTimeout(()=>lookupFromSelection(null),10); });

document.addEventListener('mousedown',e=>{ if(!pop.contains(e.target))hidePop(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){hidePop();closeDict();} });

/* =====================================================================
   DRAWER
   ===================================================================== */
function openDict(){ document.getElementById('drawer').classList.add('on');
  document.getElementById('scrim').classList.add('on'); renderList(); }
function closeDict(){ document.getElementById('drawer').classList.remove('on');
  document.getElementById('scrim').classList.remove('on'); }
function dTab(p){
  document.querySelectorAll('.dtab').forEach(b=>b.classList.toggle('on',b.dataset.pane===p));
  document.querySelectorAll('.dpane').forEach(x=>x.classList.remove('on'));
  document.getElementById('pane-'+p).classList.add('on');
  if(p==='words') renderList();
  if(p==='test')  renderTest();
}
/* The translation shown follows the KZ / RU switch in the header, so the
   dictionary needs no language control of its own. */
function prefLang(){ return (typeof lang!=='undefined' && lang==='kz') ? 'kz' : 'ru'; }

const EMPTY=`<div class="dempty">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v18H6.5A2.5 2.5 0 0 1 4 18.5z"/><path d="M8 8h7M8 12h7"/></svg>
  <div data-t="d07">Tap any word in the lesson to see its meaning and save it here.</div></div>`;

const SPKICON='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4 4 0 0 0-2-3.5v7a4 4 0 0 0 2-3.5z"/></svg>';
function renderList(){
  const el=document.getElementById('dList'); if(!el)return;
  const sum=document.getElementById('dSummary');
  const n=store.words.length;
  if(sum) sum.textContent = n ? (n+(n===1?' word saved':' words saved')) : '';
  if(!n){el.innerHTML=EMPTY;return;}
  el.innerHTML=store.words.slice().reverse().map(x=>{
    const tl=tlOf(x);
    return `
    <div class="dw">
      <button class="rm" onclick="removeWord('${x.w}')" title="Remove">&times;</button>
      <div class="top"><span class="en">${x.w}</span>${x.ipa?`<span class="ipa">/${x.ipa}/</span>`:''}
        <button class="wspk" onclick="sayWord('${x.w.replace(/'/g,"\\'")}')" title="Pronunciation" aria-label="Pronunciation">${SPKICON}</button></div>
      ${x.def?`<div class="df">${x.def}</div>`:''}
      ${tl?`<div class="tl">${tl}</div>`:''}
    </div>`;}).join('');
}

/* ---------------- review scheduling (Leitner) ---------------- */
const IVL=[0, 10*60000, 864e5, 3*864e5, 7*864e5, 21*864e5];
function migrate(){
  let ch=false;
  store.words.forEach(x=>{
    if(x.box===undefined){x.box=0;ch=true;}
    if(x.due===undefined){x.due=0;ch=true;}
    if(x.seen===undefined){x.seen=0;ch=true;}
    if(x.miss===undefined){x.miss=0;ch=true;}
  });
  if(ch)save();
}
migrate();
function schedule(w,ok){
  const r=store.words.find(x=>x.w===w); if(!r)return;
  r.seen=(r.seen||0)+1;
  if(ok){ r.box=Math.min(5,(r.box||0)+1); r.miss=Math.max(0,(r.miss||0)-1); }
  else  { r.box=0; r.miss=(r.miss||0)+1; }
  r.due=Date.now()+IVL[r.box||0]; r.last=Date.now();
  save();
}
function isDue(x){ return !x.due || x.due<=Date.now(); }
function isHard(x){ return (x.miss||0)>=2 || (x.box||0)<=1; }
/* Overdue first, then the ones that keep going wrong, then the newest. */
function byPriority(list){
  const n=Date.now();
  return list.slice().sort((a,b)=>{
    const ad=isDue(a)?0:1, bd=isDue(b)?0:1;
    if(ad!==bd)return ad-bd;
    if((b.miss||0)!==(a.miss||0))return (b.miss||0)-(a.miss||0);
    if((a.box||0)!==(b.box||0))return (a.box||0)-(b.box||0);
    return (b.at||0)-(a.at||0);
  });
}
function reLang(){ if(!lang)return; const l=lang; lang=null; setLang(l); }
function tlOf(x){ return prefLang()==='kz' ? (x.kz||x.ru||'') : (x.ru||x.kz||''); }

/* The flashcard deck was removed with the rest of the extra dictionary
   features; `deck` stays declared only for the automated test harness. */
let deck=[], di=0;

/* =====================================================================
   PRACTICE  —  every question is generated from the student's own words
   ===================================================================== */
let P={mode:null,q:[],i:0,right:0,done:false};

/* Opening the Practice tab starts a round straight away - no menu, no
   settings. Every question is built from the words the student saved. */
function renderTest(){
  const el=document.getElementById('pane-test'); if(!el)return;
  if(!store.words.length){ el.innerHTML=EMPTY; reLang(); return; }
  pStart();
}

function shuffle(a){ return a.slice().sort(()=>Math.random()-.5); }
function distract(pool,not,field,k){
  const seen={}, out=[];
  shuffle(pool).forEach(x=>{ const v=field(x);
    if(x.w!==not && v && !seen[v]){seen[v]=1;out.push(x);} });
  return out.slice(0,k);
}

/* Build one question for a word, using whatever data that word has. */
function makeQ(x,pool){
  const types=[];
  const withDef=pool.filter(y=>y.def), withTl=pool.filter(y=>tlOf(y));
  const gapOk = x.ex && new RegExp('\\b'+x.w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(x.ex);
  if(x.def && withDef.length>=4) types.push('defword','worddef');
  if(tlOf(x) && withTl.length>=4) types.push('wordtl','tlword');
  if(gapOk && pool.length>=4) types.push('gapmc');
  if(gapOk) types.push('gap');
  types.push('spell');
  const t=types[Math.floor(Math.random()*types.length)];

  if(t==='defword'){
    const wrong=distract(withDef,x.w,y=>y.def,3);
    return {t,w:x.w,kick:'Choose the meaning',head:x.w,
      opts:shuffle([x,...wrong]).map(o=>({txt:o.def,ok:o.w===x.w}))};
  }
  if(t==='worddef'){
    const wrong=distract(withDef,x.w,y=>y.w,3);
    return {t,w:x.w,kick:'Which word is it?',head:x.def,
      opts:shuffle([x,...wrong]).map(o=>({txt:o.w,ok:o.w===x.w}))};
  }
  if(t==='wordtl'){
    const wrong=distract(withTl,x.w,y=>tlOf(y),3);
    return {t,w:x.w,kick:'Choose the translation',head:x.w,
      opts:shuffle([x,...wrong]).map(o=>({txt:tlOf(o),ok:o.w===x.w}))};
  }
  if(t==='tlword'){
    const wrong=distract(withTl,x.w,y=>y.w,3);
    return {t,w:x.w,kick:'Which word is it?',head:tlOf(x),
      opts:shuffle([x,...wrong]).map(o=>({txt:o.w,ok:o.w===x.w}))};
  }
  if(t==='gapmc'||t==='gap'){
    const re=new RegExp('\\b'+x.w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');
    const sent=x.ex.replace(re,'<span class="blank"></span>');
    if(t==='gap') return {t,w:x.w,kick:'Complete the sentence',sent,type:true,ans:x.w};
    const wrong=distract(pool,x.w,y=>y.w,3);
    return {t,w:x.w,kick:'Complete the sentence',sent,
      opts:shuffle([x,...wrong]).map(o=>({txt:o.w,ok:o.w===x.w}))};
  }
  return {t:'spell',w:x.w,kick:'Listen and write the word',head:'\u{1F50A}',speak:x.w,type:true,ans:x.w,
    hint:x.def||tlOf(x)||''};
}

function pStart(){
  const pool=store.words.slice();
  const n=Math.min(10,pool.length);
  const chosen=shuffle(byPriority(pool).slice(0,Math.max(n,4))).slice(0,n);
  P={mode:'mix',q:chosen.map(x=>makeQ(x,pool)),i:0,right:0,done:false};
  pRender();
}

function pRender(){
  const el=document.getElementById('pane-test'); if(!el)return;
  if(P.i>=P.q.length) return pResults();
  const q=P.q[P.i];
  el.innerHTML=`
    <div class="pbar">
      <button class="pback" onclick="dTab('words')">&#8592; My words</button>
      <div class="pprog"><i style="width:${Math.round(P.i/P.q.length*100)}%"></i></div>
      <span class="pnum">${P.i+1} / ${P.q.length}</span>
    </div>
    <div class="pq" id="pq">
      <div class="pqk">${q.kick}</div>
      ${q.sent?`<div class="pqs">${q.sent}</div>`
              :`<div class="pqw">${q.head}${q.speak?` <span class="pspk" role="button" tabindex="0" onclick="sayWord('${q.w.replace(/'/g,"\\'")}')" title="Play again">&#128266;</span>`:''}</div>`}
      ${q.hint?`<div class="fc-meta" style="margin-top:6px">${q.hint}</div>`:''}
      ${q.type?`<input class="ptype" id="ptype" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="type the word">`
              :`<div class="tsel">${q.opts.map((o,j)=>`<button class="opt" onclick="pPick(${j},this)">${o.txt}</button>`).join('')}</div>`}
      <div class="pans" id="pans"></div>
      ${q.type?`<button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:11px" id="pgo" onclick="pTyped()">Check</button>`:''}
    </div>`;
  if(q.speak) setTimeout(()=>sayWord(q.w),320);
  const inp=document.getElementById('ptype');
  if(inp){ inp.focus(); inp.addEventListener('keydown',e=>{ if(e.key==='Enter')pTyped(); }); }
  reLang();
}

function pFeedback(ok,correct){
  const q=P.q[P.i];
  schedule(q.w,ok);
  if(ok)P.right++;
  const box=document.getElementById('pans');
  box.className='pans on'+(ok?'':' no');
  box.innerHTML=ok?'\u2713 Correct.':'\u2717 The answer is <b>'+correct+'</b>.';
  const go=document.getElementById('pgo');
  const next=document.createElement('button');
  next.className='btn btn-primary'; next.style.cssText='width:100%;justify-content:center;margin-top:11px';
  next.textContent = (P.i+1>=P.q.length) ? 'See my score' : 'Next question';
  next.onclick=()=>{P.i++;pRender();};
  if(go){ go.replaceWith(next); } else { document.getElementById('pq').appendChild(next); }
  renderList();
}

function pPick(j,btn){
  const q=P.q[P.i]; if(btn.closest('.tsel').dataset.done)return;
  btn.closest('.tsel').dataset.done='1';
  const ok=q.opts[j].ok;
  [...btn.closest('.tsel').children].forEach((b,k)=>{
    if(q.opts[k].ok)b.classList.add('mk-ok');
    else if(k===j)b.classList.add('mk-no');
  });
  pFeedback(ok, q.opts.find(o=>o.ok).txt);
}

function pTyped(){
  const q=P.q[P.i], inp=document.getElementById('ptype'); if(!inp||inp.disabled)return;
  const norm=s=>s.toLowerCase().replace(/[^a-z' -]/g,'').trim();
  const ok=norm(inp.value)===norm(q.ans);
  inp.disabled=true; inp.classList.add(ok?'mk-ok':'mk-no');
  pFeedback(ok,q.ans);
}

function pResults(){
  const el=document.getElementById('pane-test');
  const pct=Math.round(P.right/P.q.length*100);
  el.innerHTML=`
    <div class="tscore"><div class="big">${P.right} / ${P.q.length}</div>
      <div class="sm">${pct>=80?'Strong.':pct>=50?'Getting there.':'Worth another go.'}</div>
    </div>
    <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:12px" onclick="pStart()">Practise again</button>
    <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:8px" onclick="dTab('words')">My words</button>`;
  renderList(); reLang();
}

count(); renderList();

/* =====================================================================
/* ======================= WRAP CHECKLIST ======================= */
document.querySelectorAll('#can li').forEach(li=>li.onclick=()=>li.classList.toggle('got'));


/* ======================= WORD COUNTERS ======================= */
[['wWeek','c1'],['wQs','c2']].forEach(([ta,c])=>{
  const t=document.getElementById(ta); if(!t)return;
  t.addEventListener('input',()=>{
    document.getElementById(c).textContent=(t.value.match(/[A-Za-z\u0400-\u04FF][A-Za-z'\u2019\u0400-\u04FF-]*/g)||[]).length;
  });
});

/* Delegated counter, so a counter works in whichever lesson is on screen. */
ws.addEventListener('input',e=>{
  const t=e.target;
  if(!t||t.tagName!=='TEXTAREA'||!t.dataset.count)return;
  const c=document.getElementById(t.dataset.count); if(!c)return;
  c.textContent=(t.value.match(/[A-Za-z\u0400-\u04FF][A-Za-z'\u2019\u0400-\u04FF-]*/g)||[]).length;
});

/* Generic: every textarea[data-track] followed by a .wcount gets a live count.
   Re-bound on every openLesson, so it works for any lesson, not just the first. */
function bindCounters(){
  ws.querySelectorAll('textarea[data-track]').forEach(t=>{
    if(t.dataset.wcBound)return;
    let box=null, n=t.nextElementSibling, hop=0;
    while(n&&!box&&hop<3){
      if(n.classList&&n.classList.contains('wcount'))box=n.querySelector('span');
      n=n.nextElementSibling; hop++;
    }
    if(!box)return;
    t.dataset.wcBound='1';
    const upd=()=>{box.textContent=(t.value.match(/[A-Za-z\u0400-\u04FF][A-Za-z'\u2019\u0400-\u04FF-]*/g)||[]).length;};
    t.addEventListener('input',upd); upd();
  });
}

/* ======================= STAGE NAVIGATION ======================= */
function buildRail(){
  rail.innerHTML='';
  stages.forEach((s,i)=>{
    const b=document.createElement('button'); b.className='step';
    b.innerHTML=`<div class="sn">STAGE ${i+1}</div><div class="st">${s.dataset.stage}</div>`;
    b.onclick=()=>go(i); rail.appendChild(b);
  });
}
function go(i){
  cur=Math.max(0,Math.min(stages.length-1,i)); visited.add(cur);
  stages.forEach((s,n)=>s.classList.toggle('on',n===cur));
  [...rail.children].forEach((b,n)=>{ b.classList.toggle('on',n===cur); b.classList.toggle('done',n!==cur&&visited.has(n)); });
  document.getElementById('back').disabled=cur===0;
  document.getElementById('next').textContent=cur===stages.length-1?'Finish':'Next \u203a';
  document.getElementById('pos').textContent=`Stage ${cur+1} of ${stages.length} \u2014 ${stages[cur].dataset.stage}`;
  clearAudio(); renderNotes();
  if(cur===stages.length-1&&typeof buildSummary==='function')buildSummary();
  window.scrollTo({top:0,behavior:'smooth'});
}
function renderNotes(){
  const st=stages[cur]?stages[cur].dataset.stage:'';
  const box=document.getElementById('tnotes'), tm=document.getElementById('timing');
  if(box) box.innerHTML=(NOTES[st]||[]).map(([h2,b])=>`<div class="tnote"><b>${h2}</b>${b}</div>`).join('');
  if(tm) tm.innerHTML=(TIMING[st]||[]).map(t=>`<span>${t}</span>`).join('');
}

/* ======================= LESSON LOADING ======================= */
function openLesson(n){
  if(typeof recCleanup==="function")recCleanup();
  if(!LESSONS[n]){toast('Lesson '+n+' is not built yet.');return;}
  clearAudio();
  lessonNo=n; CUR=LESSONS[n];
  VOCAB=CUR.VOCAB; DEFS=CUR.DEFS; CTX=CUR.CTX; IMG=CUR.IMG; COLLOC=CUR.COLLOC||{};
  SLIDES=CUR.SLIDES; PICWORDS=CUR.PICWORDS; PICTASK=CUR.PICTASK;
  NOTES=CUR.NOTES; TIMING=CUR.TIMING;
  taskScores.clear(); errByStage.clear(); visited.clear(); heldWord=null;
  ws.innerHTML=CUR.html;
  ws.querySelectorAll('img[data-img]').forEach(im=>{const k=im.dataset.img; if(IMG[k])im.src=IMG[k];});
  stages=[...ws.querySelectorAll('.stage')];
  document.getElementById('crumbUnit').textContent='Unit '+CUR.unit+' \u00b7 '+UNITS[CUR.unit-1][0];
  document.getElementById('crumbLesson').textContent='Lesson '+CUR.no;
  document.getElementById('lessonTitle').textContent=CUR.title;
  document.getElementById('prevLesson').disabled=!LESSONS[n-1];
  document.getElementById('nextLesson').disabled=!LESSONS[n+1];
  recBind();
  if(typeof paintLangButtons==='function')paintLangButtons();
  mountAudio(); buildVocab(); fill('tMatch',DEFS);
  if(typeof paintSeqNav==='function'){paintSeqNav();paintNextStep();revealActive();} if(CUR.QAS)fill('tQA',CUR.QAS); buildSlider(); buildSegList();
  bindAll(); bindCounters(); buildPicTask(); buildRail(); paintDone(); go(0); railDone(); paintSidebar();
  if(lang)setLang(lang);
  try{localStorage.setItem('jts_preint_course_last',String(n));}catch(e){}
}

/* ---- unit test: one screen, one check, a pass mark and a retake ---- */
function openReview(u){
  if(typeof recCleanup==="function")recCleanup();
  const R=REVIEWS[u];
  if(!R){toast('The Unit Test for Unit '+u+' is not built yet.');return;}
  clearAudio();
  lessonNo='R'+u; CUR=R;
  VOCAB=[];DEFS=[];CTX={};IMG={};SLIDES=[];PICWORDS=[];PICTASK=[];NOTES={};TIMING={};
  taskScores.clear(); errByStage.clear(); visited.clear(); heldWord=null;
  ws.innerHTML=R.html;
  stages=[...ws.querySelectorAll('.stage')];
  document.getElementById('crumbUnit').textContent='Unit '+u+' · '+UNITS[u-1][0];
  document.getElementById('crumbLesson').textContent=isFinalTest(u)?'Final Test':'Unit Test';
  document.getElementById('lessonTitle').textContent=R.title;
  document.getElementById('prevLesson').disabled=true;
  document.getElementById('nextLesson').disabled=true;
  if(typeof paintLangButtons==='function')paintLangButtons();
  mountAudio(); bindAll(); recBind(); buildRail(); paintDone(); go(0); railDone(); paintSidebar();
  if(typeof paintSeqNav==='function'){paintSeqNav();paintNextStep();revealActive();}
  if(lang)setLang(lang);
}
function checkReview(btn){
  check(btn);
  const t=btn.closest('.task'), s=taskScores.get(t)||[0,0];
  const total=s[1]||CUR.items, pass=CUR.pass, ok=s[0]>=pass;
  const box=document.getElementById('reviewResult'); if(!box)return;
  saveTestScore('R',CUR.unit,s[0],total,ok);
  box.className='review-result '+(ok?'pass':'fail');
  box.innerHTML='<div class="score">'+s[0]+' / '+total+'</div>'+
    '<p><b>'+(ok?'Pass.':'Not yet.')+'</b> The pass mark is '+pass+' out of '+total+'.</p>'+
    '<p class="again">You can take this test as many times as you like.</p>'+
    '<button class="btn btn-ghost" onclick="resetReview()">Try again</button>';
}
function resetReview(){
  const u=CUR.unit;
  delete doneAll['L'+lessonNo]; clearTestScore('R',u); saveDone();
  openReview(u);
  window.scrollTo({top:0,behavior:'smooth'});
}

function resetLesson(){
  doneAll['L'+lessonNo]={}; saveDone();
  openLesson(lessonNo);
}

/* ======================= MODE SWITCHING ======================= */
const LABEL={self:'Self-Study',solo:'1-to-1',group:'Group Study'};
function setMode(m){
  mode=m; JCROOT().dataset.mode=m;
  document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
  const c=document.getElementById('crumbMode'); if(c)c.textContent=LABEL[m];
  updateScore(); paintDone(); railDone();
  if(typeof paintLangButtons==='function')paintLangButtons();
}

/* exposed for the automated test suite */
window.REVIEWS=REVIEWS; window.TR=TR; window.DICT=DICT; window.IMG=IMG; window.LESSONS=LESSONS; window.UNITS=UNITS; window.AUDIO_B64=AUDIO_B64;
Object.defineProperty(window,'store',{get:()=>store});
Object.defineProperty(window,'practice',{get:()=>P});
Object.defineProperty(window,'deck',{get:()=>deck});
window.IMGX=IMGX;
Object.defineProperty(window,'doneMap',{get:()=>bag()});
Object.defineProperty(window,'stages',{get:()=>stages});
Object.defineProperty(window,'lessonNo',{get:()=>lessonNo});
/* Инлайновые обработчики разметки курса ищут эти функции в window. */
Object.assign(window,{JCROOT,toast,testKey,saveTestScore,getTestScore,clearTestScore,lesRow,isFinalTest,testTitle,testTitleTxt,closedUnits,saveClosedUnits,toggleAllUnits,paintExpandBtn,buildSidebar,openMenu,closeMenu,toggleMenu,paintUnitProgress,seqIndex,seqOpen,seqLabel,seqDone,stepLesson,paintSeqNav,paintNextStep,revealActive,paintTestChip,paintSidebar,trackSrc,mountAudio,clearAudio,restore,arm,playRange,playN,playSeg,playAll,playFull,playPart,playEx,playCue,playS15,playS18,play62,play63,playPeople,play64,play65,play617,playChunk,play613,play615,play616,playNews,playObj,play52,play53,playDecl,play58,playShop,play56,play57,play59,playU,playFood,playCan,playWaste,playComp,playPhrase,playWord103,playSlide,playClip,buildSegList,togglePattern,visible,extendsAnswer,captureCues,check,updateScore,buildSlider,renderSlide,slide,fcFaces,flipTile,cardAdd,syncAddButtons,buildVocab,fill,bindAll,buildPicTask,pickWord,dropWord,buildSummary,saveDone,bag,markDone,clearDone,resetTask,againTask,allDone,paintDone,railDone,langAllowed,paintLangButtons,setLang,REC_T,recSupported,recNote,recFmt,recTick,recStopPlayback,recRender,recPlay,recDel,recCleanup,recBind,save,has,count,addWord,removeWord,lookupWord,hidePop,popAdd,sayWord,wordAtPoint,selectedWord,lookupFromSelection,openDict,closeDict,dTab,prefLang,renderList,migrate,schedule,isDue,isHard,byPriority,reLang,tlOf,renderTest,shuffle,distract,makeQ,pStart,pRender,pFeedback,pPick,pTyped,pResults,bindCounters,buildRail,go,renderNotes,openLesson,openReview,checkReview,resetReview,resetLesson,setMode});
window.__JC={
  openLesson, openReview, setMode, go,
  flush(){ try{ flushWriting() }catch(e){} },
  /* Счёт урока для наград приложения: только проверяемые задания. */
  score(){ let ok=0,total=0; document.querySelectorAll(".task").forEach(t=>{
    if(!visible(t))return; const s=taskScores.get(t); if(s){ok+=s[0];total+=s[1];} });
    return {ok,total}; },
  stageCount:()=>stages.length,
  stageIndex:()=>cur,
};
window.dispatchEvent(new CustomEvent('jc:ready'));
})();