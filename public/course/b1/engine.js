/* Собрано scripts/extract-course-lessons.js из курс-файла уровня. */
(function(){
/* Данные уровня приходят от приложения (см. src/learning/CourseLesson.jsx). */
const UNITS=window.__JC_UNITS||[];
const LESSONS=window.__JC_LESSONS||{};
const REVIEWS=window.__JC_REVIEWS||{};
const AUDIO_B64={};
function JCROOT(){ return document.querySelector('.jc')||document.body; }

const DICT={
/* Unit 1 vocabulary. word -> [ipa, definition, KZ, RU, example] */
"friendship":["ˈfrendʃɪp","the relationship between two people who are friends","достық","дружба","Her friendship means a lot to me."],
"get on (well with someone)":["ˌɡet ˈɒn","to have a good relationship with someone","тіл табысу","ладить (с кем-то)","I get on really well with the people at work."],
"have a lot in common":["ˌhæv ə ˌlɒt ɪn ˈkɒmən","to share a lot of interests, ideas or experiences with someone","көп ортақтығы болу","иметь много общего","I don&rsquo;t have a lot in common with them apart from football."],
"fall out (with someone)":["ˌfɔːl ˈaʊt","to have an argument and stop being friendly with someone","ренжісіп қалу","поссориться","I rarely fall out with my friends."],
"keep in touch (with someone)":["ˌkiːp ɪn ˈtʌtʃ","to continue to write, call or message someone you do not see often","байланыста болу","поддерживать связь","How do you keep in touch with friends who live far away?"],
"meet up":["ˌmiːt ˈʌp","to meet someone you have arranged to see, usually socially","кездесу","встречаться","We meet up after work from time to time."],
"socialize":["ˈsəʊʃəlaɪz","to spend time with other people in a friendly way","араласу","общаться","Do you socialize outside work?"],
"trust":["trʌst","to believe that someone is honest and will not hurt you","сену","доверять","I can trust my closest friend with all my secrets."],
"communication":["kəˌmjuːnɪˈkeɪʃn","the activity of sharing information, news and feelings with other people","қарым-қатынас","общение, связь","The internet has improved communication with friends who live abroad."],
"connect":["kəˈnekt","to join two things, people or ideas together","байланыстыру","соединять, связывать","The app connects people who have never actually met."],
"reunite":["ˌriːjuːˈnaɪt","to come together again after a long time apart","қайта қауышу","воссоединяться","He is reuniting with friends he last saw at school."],
"media":["ˈmiːdiə","television, radio, newspapers and the internet, seen as a group","бұқаралық ақпарат құралдары","СМИ, медиа","When we use new media, our brain works in a different way."],
"smartphone":["ˈsmɑːtfəʊn","a mobile phone that also works like a small computer","смартфон","смартфон","The smartphone has changed the way we all access information."],
"membership":["ˈmembəʃɪp","the state of belonging to a club, group or organization","мүшелік","членство","The annual membership is too expensive for me."],
"leisure time":["ˈleʒə taɪm","the time when you are not working and can do what you enjoy","бос уақыт","свободное время","Most of my leisure time goes on people, not on things."],
"movement":["ˈmuːvmənt","a group of people who work together to achieve something they believe in","қозғалыс","движение","There are now movements like this in over sixty-five countries."],
"develop":["dɪˈveləp","to grow or change gradually into something stronger or more complete","дамыту","развиваться","Our friendship has developed over time."],
"improvement":["ɪmˈpruːvmənt","a change that makes something better than it was","жақсару","улучшение","There have been some amazing improvements in the way we can get information."],
"behave":["bɪˈheɪv","to act in a particular way, especially towards other people","өзін ұстау","вести себя","The internet is changing the way our brains behave."],
"currently":["ˈkʌrəntli","at this present time","қазіргі уақытта","в настоящее время","Rob is currently meeting every single friend on his page."],
"lately":["ˈleɪtli","recently; in the period just before now","соңғы кезде","в последнее время","How many of your online friends have you actually seen lately?"],
"occasional":["əˈkeɪʒənl","happening sometimes, but not regularly or often","анда-санда болатын","редкий, нерегулярный","We send the occasional message to each other."],
"consumer":["kənˈsjuːmə","a person who buys goods or services","тұтынушы","потребитель","High-street shops offer a wide choice of products for the consumer."],
"purchase":["ˈpɜːtʃəs","something you buy; the act of buying it","сатып алу","покупка","You may get a discount on your purchases, but you should be careful."],
"bargain":["ˈbɑːɡɪn","something you buy for much less than its usual price","арзан бағадағы дүние","выгодная покупка","What have you bought recently that was a bargain?"],
"deal":["diːl","an agreement to buy something, especially at a good price","мәміле","сделка, выгодное предложение","Have you ever bought something you didn&rsquo;t need because it was a good deal?"],
"half-price":["ˌhɑːf ˈpraɪs","costing half of the usual price","жарты бағамен","за полцены","All of these items are half-price."],
"special offer":["ˌspeʃl ˈɒfə","a price that is lower than usual for a short time","арнайы ұсыныс","специальное предложение","The shops have amazing special offers in the run-up to Christmas."],
"on credit":["ɒn ˈkredɪt","buying something now and paying for it later","несиеге","в кредит","There is a danger of buying things on credit and owing a lot of money."],
"guilt-free":["ˌɡɪlt ˈfriː","not making you feel that you have done something wrong","кінәсіз","без чувства вины","How do you feel about the fact that guilt-free brands are often more expensive?"],
"harmful":["ˈhɑːmfl","causing damage to people or to the natural world","зиянды","вредный","Transporting goods by air has a harmful effect on the environment."],
"charity":["ˈtʃærəti","an organization that collects money to help people in need","қайырымдылық ұйымы","благотворительная организация","His aim is to raise money for a children&rsquo;s charity."],
"trend":["trend","a general change in the way people behave or in what they like","үрдіс","тенденция, тренд","The latest trend is for so-called guilt-free brands."],
"resources":["rɪˈsɔːsɪz","the supplies of things like water, oil or wood that a country has","ресурстар","ресурсы","People should not consume more than their fair share of the world&rsquo;s resources."],
"item":["ˈaɪtəm","one single thing in a list or a group of things","зат, бұйым","товар, предмет","Many items are half-price or two for the price of one."],
"queue":["kjuː","to stand in a line of people waiting for something","кезекте тұру","стоять в очереди","Some people have queued overnight to get in first."],
"run-up":["ˈrʌn ʌp","the period of time just before an important event","қарсаңы","период перед событием","The shops have special offers in the run-up to Christmas."],
"secure":["sɪˈkjʊə","safe, and not likely to change or be lost","қауіпсіз","надёжный, стабильный","The important thing is to feel secure in your job."],
"security":["sɪˈkjʊərəti","the state of being safe, or the things done to keep you safe","қауіпсіздік","безопасность","I am always careful about my personal security online."],
"transport":["trænˈspɔːt","to move goods or people from one place to another","тасымалдау","перевозить","I&rsquo;m not sure transporting goods by air is a good idea."],
"injury":["ˈɪndʒəri","physical harm done to a person&rsquo;s body","жарақат","травма","There have been over fifty injuries in the past five years."],
"prove":["pruːv","to show that something is definitely true","дәлелдеу","доказывать","This proves the internet is a powerful tool."],
"convinced":["kənˈvɪnst","completely sure that something is true","сенімді","убеждённый","I&rsquo;m convinced that people would stop if they understood the damage."],
"admit":["ədˈmɪt","to agree that something bad or embarrassing is true","мойындау","признавать","Most shoppers admit they buy things they do not need."],
"think":["θɪŋk","to have an opinion about something; to use your mind","ойлау","думать, считать","I think it&rsquo;s too expensive. / I&rsquo;m thinking about buying it."],
"believe":["bɪˈliːv","to think that something is true","сену","считать, верить","We believe shopping makes us happy, but it doesn&rsquo;t."],
"mean":["miːn","to have a particular meaning; to intend something","мағынасы болу","значить, иметь в виду","It all depends what you mean by a bargain."],
"realize":["ˈriːəlaɪz","to understand or become aware of something","түсіну","осознавать","It&rsquo;s amazing to realize that 20% of us use 80% of the resources."],
"prefer":["prɪˈfɜː","to like one thing better than another","артық көру","предпочитать","Most of the time we prefer people to buy locally."],
"belong":["bɪˈlɒŋ","to be owned by someone, or to be in the right place","тиесілі болу","принадлежать","Half the things in my flat don&rsquo;t really belong to me."],
"recognize":["ˈrekəɡnaɪz","to know someone or something because you have seen it before","тану","узнавать","Every product is recognized by its own logo."],
"own":["əʊn","to have something that belongs to you","иелену","владеть","In countries like the UK, we all own far too much."],
"understand":["ˌʌndəˈstænd","to know the meaning or the reason for something","түсіну","понимать","Most people don&rsquo;t understand how difficult one day without spending is."],
"opinion":["əˈpɪnjən","what you think or believe about something","пікір","мнение","In my opinion, the advert is better than the product."],
"expression":["ɪkˈspreʃn","a word or phrase with a particular meaning","сөз тіркесі","выражение","The expression <i>Black Friday</i> has been used two billion times on Twitter."],
"judgement":["ˈdʒʌdʒmənt","the ability to make good decisions about what to do","пайым","суждение, здравый смысл","We need to use our own judgement before computers take over."],
"definition":["ˌdefɪˈnɪʃn","an explanation of exactly what a word or idea means","анықтама","определение","What is your definition of a true friend?"],
"effect":["ɪˈfekt","a change that happens because of something else","әсер","эффект, влияние","Don&rsquo;t you think adverts have an effect on young people?"],
"persuade":["pəˈsweɪd","to make someone agree to do or believe something","көндіру","убеждать","He persuades them to give to his charity."],
"deeply":["ˈdiːpli","very much; in a serious and thorough way","терең","глубоко","We never take any time to think about things deeply."],
"ability":["əˈbɪləti","the fact that you can do something","қабілет","способность","The digital age is making us lose our ability to do one thing at a time."],
"able":["ˈeɪbl","having the skill, time or chance to do something","қабілетті","способный","We are less able to make deep connections in our brain."],
"achievement":["əˈtʃiːvmənt","something good that you succeed in doing after effort","жетістік","достижение","Although it was hard work, it was an amazing achievement."],
"choice":["tʃɔɪs","the act of choosing, or the range of things you can choose from","таңдау","выбор","People should think about the effect their buying choices have."],
"opportunity":["ˌɒpəˈtjuːnəti","a situation in which it is possible for you to do something","мүмкіндік","возможность","Social media gives everyone the opportunity to be heard."],
"process":["ˈprəʊses","a series of actions that lead to a particular result","үдеріс","процесс","He hopes to meet all 700 friends, travelling thousands of miles in the process."],
"govern":["ˈɡʌvn","to officially control a country or an area","басқару","управлять","Who is the region governed by?"],
"government":["ˈɡʌvənmənt","the group of people who control a country","үкімет","правительство","The government has announced the latest tax proposals."],
"post":["pəʊst","one piece of writing that someone puts on social media","жазба","пост, публикация","My post got more comments than anything I have written."],
"caption":["ˈkæpʃn","the short text written under a photo or a video","сурет астындағы жазба","подпись к фото","The photo is fine &mdash; the caption is what people argue about."],
"hashtag":["ˈhæʃtæɡ","a word or phrase after the sign #, used to mark a topic","хэштег","хештег","One hashtag and the whole thread was suddenly public."],
"thread":["θred","a series of connected messages or posts on the same subject","талқылау тізбегі","тред, ветка","Read the whole thread before you reply to it."],
"share":["ʃeə","to send something you like to other people online","бөлісу","делиться, репостить","People share the thirty-six questions every year."],
"follower":["ˈfɒləʊə","a person who chooses to see what you post online","жазылушы","подписчик","He has more followers than friends, and he knows it."],
"comment":["ˈkɒment","something you write to say what you think about a post","пікір","комментарий","The first comment was polite. The tenth was not."],
"link":["lɪŋk","a place in a text you click to open another page","сілтеме","ссылка","I put the link at the end so people can read it themselves."],
"escape":["ɪˈskeɪp","to get away from a place or a situation; an occasion when you get away","қашу; құтылу","сбежать; побег","That reminds me of a man who had a lucky escape."],
"survive":["səˈvaɪv","to stay alive after an accident or a very dangerous event","аман қалу","выжить","He survived by drinking water mixed with barbecue sauce."],
"disappear":["ˌdɪsəˈpɪə","to go somewhere where nobody can see or find you","жоғалып кету","исчезать","The hippo had quietly disappeared."],
"float":["fləʊt","to stay on the surface of water, or to move slowly through the air","қалқып жүру","плавать, парить","A large silver balloon was floating high in the sky."],
"underwater":["ˌʌndəˈwɔːtə","below the surface of the water","су астында","под водой","I turned round to push it away, and then I realized I was underwater."],
"surface":["ˈsɜːfɪs","the top of the water, where it meets the air","бет","поверхность","I remember looking up at the surface of the water."],
"breath":["breθ","the air that goes into and out of your lungs","тыныс","дыхание","I remember wondering which of us could hold his breath the longest."],
"jaw":["dʒɔː","the lower part of the face, that moves when you eat or speak","жақ","челюсть","My hand touched a hippo&rsquo;s nose, and then its jaw."],
"weak":["wiːk","not strong; without much power or energy","әлсіз","слабый","After twenty-four days without food he was very weak."],
"sour":["ˈsaʊə","having a sharp taste, like a lemon","қышқыл","кислый","The fruit is supposed to make sweet things taste sour."],
"watermelon":["ˈwɔːtəmelən","a very large green fruit that is red and full of water inside","қарбыз","арбуз","A picture of a bright blue watermelon was circulating on the internet."],
"cable car":["ˈkeɪbl kɑː","a small vehicle that hangs from a wire and carries people up a mountain","аспалы жол","канатная дорога","He decided not to take the cable car down with his friends."],
"be stuck":["bi ˈstʌk","to be unable to move or to get out of a place","қалып қою","застрять","I realized I was stuck inside something."],
"knock into":["ˈnɒk ˌɪntə","to hit something by accident while you are moving","соғылып қалу","врезаться","Something knocked into the boat and we all fell in."],
"turn around":["ˌtɜːn əˈraʊnd","to move so that you are facing the other way","бұрылу","повернуться","I turned around to push it away, when suddenly everything went dark."],
"scream":["skriːm","to cry out loudly in a high voice, usually because you are afraid","айқайлау","кричать","I screamed loudly, but nobody could hear me."],
"whisper":["ˈwɪspə","to speak very quietly so that only one person can hear","сыбырлау","шептать","He whispered something to me and then walked away."],
"ordinary":["ˈɔːdnri","normal; not special or unusual in any way","қарапайым","обычный","It started out as just an ordinary day at work."],
"medical":["ˈmedɪkl","connected with medicine and the treatment of illness","медициналық","медицинский","By chance, a medical team was nearby and they helped me."],
"hire":["ˈhaɪə","to pay to use something for a short time, or to give somebody a job","жалдау","арендовать, нанимать","They had hired a small boat for the afternoon."],
"charge":["tʃɑːdʒ","to put electricity into a battery, or to ask a price for something","зарядтау","заряжать; брать плату","The hoax claimed that dialling 999 would charge your phone battery."],
"sharply":["ˈʃɑːpli","suddenly and by a large amount","күрт","резко","Calls to the emergency number had risen sharply in recent months."],
"remarkably":["rɪˈmɑːkəbli","in a way that surprises you because it is unusual","таңқаларлықтай","удивительно","Remarkably, he walked away from the accident without a scratch."],
"luckily":["ˈlʌkɪli","used to say that something good happened by chance","бақытымызға орай","к счастью","Luckily, he had brought a bottle of barbecue sauce with him."],
"fortunately":["ˈfɔːtʃənətli","luckily; it is good that this happened","бақытқа орай","к счастью","Fortunately, we got to the airport on time."],
"unfortunately":["ʌnˈfɔːtʃənətli","it is a pity that this happened","өкінішке орай","к сожалению","Unfortunately, we weren&rsquo;t able to talk to Dr Green."],
"sadly":["ˈsædli","used to say that something is disappointing or unhappy","өкінішке қарай","к сожалению, увы","Sadly, none of the students passed the final exam."],
"curiously":["ˈkjʊəriəsli","in a way that is strange and hard to explain","қызық жері","любопытно, странным образом","Orchestras, curiously, started hiring women left, right and centre."],
"hoax":["həʊks","a story or a trick that makes people believe something untrue","алдау, жалған хабар","мистификация, розыгрыш","It turns out the story was another internet hoax."],
"fake":["feɪk","something made to look real in order to trick people","жалғаны","подделка","In 1953 researchers discovered that it was, in fact, a fake."],
"claim":["kleɪm","to say that something is true, without proving it","мәлімдеу","утверждать","The hoax claims that calling 999 will charge your phone battery."],
"evidence":["ˈevɪdəns","facts or objects that show that something is true","дәлел","доказательства","Scientists were keen to find some evidence that would prove the link."],
"announce":["əˈnaʊns","to tell people about something officially and publicly","хабарлау","объявлять","The parents suddenly announced that they had found him at home."],
"report":["rɪˈpɔːt","to tell people about something in the news","хабарлау","сообщать","The media reported that a six-year-old boy was inside the balloon."],
"inform":["ɪnˈfɔːm","to officially tell somebody about something","хабардар ету","информировать","The police were informed and helicopters were sent up."],
"invent":["ɪnˈvent","to make up a story that is not true, or to create something new","ойлап табу","выдумать, изобрести","A journalist actually invented the story."],
"coincidence":["kəʊˈɪnsɪdəns","two things happening at the same time by chance","кездейсоқтық","совпадение","Coincidences often feel meaningful, but usually they are not."],
"conclusion":["kənˈkluːʒn","the decision you reach after thinking about all the facts","қорытынды","вывод","The conclusion was that the judges were deciding on what they could see."],
"mention":["ˈmenʃn","to say something quickly, without giving details","айтып қалу","упомянуть","The boy accidentally mentioned that they had done it to be on TV."],
"keep quiet":["ˌkiːp ˈkwaɪət","to say nothing about something you know","үндемей қалу","молчать, не проболтаться","He was supposed to keep quiet about that."],
"circulate":["ˈsɜːkjəleɪt","to pass from person to person, especially online","таралу","циркулировать, распространяться","A picture has been circulating on the internet of a bright blue watermelon."],
"create":["kriˈeɪt","to make something that did not exist before","жасау","создавать","It is easy to create a hoax now that everyone can change photos digitally."],
"consecutively":["kənˈsekjətɪvli","one after another, without a break","қатарынан","подряд","An expert is a man who makes three correct guesses consecutively."],
"expect":["ɪkˈspekt","to think or believe that something will happen","күту","ожидать","Nobody expected the story to be checked before it was published."],
"responsible":["rɪˈspɒnsəbl","being the person who caused something, especially something bad","жауапты","ответственный","Dawson, who most people consider responsible for the fake, had died."],
"waste":["weɪst","to use time or money badly, on something with no result","босқа жіберу","тратить впустую","Scientists had wasted nearly forty years believing a lie."],
"system":["ˈsɪstəm","a set of rules or a way of organizing how something works","жүйе","система","Under this system, most of the musicians who were chosen were men."],
"track":["træk","to follow something and find out where it is going","қадағалау","отслеживать","Helicopters were sent up to track the balloon."],
"stream":["striːm","a small narrow river","бұлақ","ручей","He fell in a stream and broke his leg."],
"screen":["skriːn","a flat surface that hides something, or that shows a picture","экран","экран, ширма","Orchestras started putting up screens in the rooms where auditions took place."],
"live":["laɪv","at the same time as it is happening","тікелей эфирде","в прямом эфире","By the time the balloon landed, the story was live on television."],
"free":["friː","to get a person or a part of the body out of a place they are stuck in","босату","освободить","I managed to free one hand and felt around."],
"interestingly":["ˈɪntrəstɪŋli","used to say that what follows is worth noticing","қызығы сол","интересно, что","Interestingly, I know a lot of people who want to work on television."],
"surprisingly":["səˈpraɪzɪŋli","used to say that something is not what you would expect","таңқаларлықтай","неожиданно","Surprisingly, the results Moskowitz obtained were completely confusing."],
"personally":["ˈpɜːsənəli","used to say that this is only your own view","жеке өзім","лично я","Personally, I think the story was funny rather than harmful."],
"tell":["tel","to give somebody information by speaking to them","айту","рассказывать","They told the public to ignore the hoax."],
"remind":["rɪˈmaɪnd","to make somebody think of something they know or remember","еске салу","напоминать","That reminds me of another story I heard."],
"remember":["rɪˈmembə","to keep something in your mind, or bring it back into your mind","есте сақтау","помнить","I remembered it so clearly."],
"wonder":["ˈwʌndə","to ask yourself questions about something","ойлану","задаваться вопросом","I remember wondering which of us could hold his breath the longest."],
"appear":["əˈpɪə","to suddenly be seen","пайда болу","появиться","A huge hippo suddenly appeared."],
"attempt":["əˈtempt","an act of trying to do something","әрекет","попытка","The whole story had been made up in an attempt to get a reality TV deal."],
"lose contact":["ˌluːz ˈkɒntækt","to stop writing to or hearing from somebody","байланысты үзу","потерять связь","Barry had lost contact with his family while he was working abroad."],
"keen":["kiːn","very interested in doing something","құлшынысты","увлечённый, стремящийся","Scientists were keen to find some evidence."],
"challenge":["ˈtʃælɪndʒ","something difficult that tests your ability","сын-қатер","вызов, испытание","Those children who could rise to the challenge were more successful later."],
"contest":["ˈkɒntest","a competition in which people try to win something","байқау","конкурс, состязание","They take part in a contest against professionals."],
"confidence":["ˈkɒnfɪdəns","the belief that you can do something well","сенімділік","уверенность","You need a lot of confidence to succeed as a chef."],
"intelligence":["ɪnˈtelɪdʒəns","the ability to learn, understand and think clearly","зерде","интеллект, ум","He is good at using his intelligence to solve problems."],
"experiment":["ɪkˈsperɪmənt","a scientific test done to find out what happens","тәжірибе","эксперимент","One group who took part in the experiment were told nothing."],
"marshmallow":["ˌmɑːʃˈmæləʊ","a soft, sweet white food","маршмеллоу","маршмеллоу, зефир","Wait, and you can have two marshmallows as a reward."],
"temptation":["tempˈteɪʃn","a strong wish to do something you know you should not do","азғыру","искушение, соблазн","The children are trying to resist the temptation to eat the marshmallow."],
"resist":["rɪˈzɪst","to stop yourself doing something you would like to do","қарсы тұру","сопротивляться, удержаться","If the children managed to resist temptation, they got a reward."],
"reward":["rɪˈwɔːd","something good you are given for doing well","сыйақы","награда","The researcher promised them a reward of two marshmallows."],
"measure":["ˈmeʒə","to find the size, amount or level of something","өлшеу","измерять","The Social Stress Test is a way of measuring stress."],
"observe":["əbˈzɜːv","to watch somebody or something carefully","бақылау","наблюдать","Pick up some valuable lessons by observing someone whose patience you admire."],
"manage":["ˈmænɪdʒ","to succeed in doing something difficult","қолынан келу","суметь, справиться","Some managed to wait a while before giving in."],
"beat":["biːt","to defeat somebody in a game or competition; to move fast and regularly","жеңу; соғу","побеждать; биться","You sweat, your mouth goes dry, your heart starts beating fast."],
"admire":["ədˈmaɪə","to respect somebody for what they are or what they do","сүйсіну","восхищаться","Observe someone whose patience you admire."],
"give in":["ˌɡɪv ˈɪn","to stop trying to resist something","беріліп қалу","сдаться, поддаться","Most of the children gave in before the time was up."],
"make an effort":["ˌmeɪk ən ˈefət","to try hard to do something","күш салу","приложить усилие","If they didn&rsquo;t think about it, they didn&rsquo;t have to make an effort not to eat it."],
"on impulse":["ɒn ˈɪmpʌls","suddenly, without thinking about it first","ойланбастан","под влиянием момента","Never buy things on impulse."],
"symptom":["ˈsɪmptəm","a sign that shows you have an illness or a problem","белгі","симптом, признак","One of the test groups experienced symptoms of stress."],
"sweat":["swet","to lose water through your skin when you are hot or nervous","терлеу","потеть","When I give a talk, I sweat and my mouth goes dry."],
"damage":["ˈdæmɪdʒ","harm done to something so that it is broken or worse","зақым","повреждение, вред","There are signs of damage to the blood vessels around the heart."],
"result":["rɪˈzʌlt","what happens because of something else; the score or outcome","нәтиже","результат","The results have been scientifically proven."],
"attention":["əˈtenʃn","the act of watching, listening or thinking about something carefully","назар","внимание","If you turn your attention away from the chocolate, you may forget about it."],
"professional":["prəˈfeʃənl","a person who does a job that needs special training","кәсіби маман","профессионал","They take part in a contest against professionals."],
"schedule":["ˈʃedjuːl","a plan of what somebody has to do and when","кесте","расписание, график","She&rsquo;s the best one in the team at managing schedules."],
"deadline":["ˈdedlaɪn","the time by which something must be finished","мерзім","дедлайн, срок","It&rsquo;s a high-pressure job, so he must work to tight deadlines."],
"multitask":["ˌmʌltiˈtɑːsk","to do several things at the same time","бірнеше істі қатар істеу","делать несколько дел сразу","He&rsquo;s great at multitasking."],
"set goals":["ˌset ˈɡəʊlz","to decide what you want to achieve","мақсат қою","ставить цели","He&rsquo;s very good at setting goals."],
"think ahead":["ˌθɪŋk əˈhed","to plan for what will happen in the future","алдын ала ойлау","думать наперёд","Think ahead. Plan for the future and you will succeed."],
"work hard":["ˌwɜːk ˈhɑːd","to put a lot of effort into your work","қажымай еңбек ету","усердно работать","She&rsquo;s good at working hard on a project."],
"precise":["prɪˈsaɪs","exact and accurate, with no mistakes","дәл","точный","As a chef, it&rsquo;s important to work to very precise times."],
"patient":["ˈpeɪʃnt","able to wait calmly without getting annoyed","шыдамды","терпеливый","Most of the children found it difficult to be patient."],
"polite":["pəˈlaɪt","behaving in a way that shows respect for other people","сыпайы","вежливый","He also had to be polite to the customers."],
"pleasant":["ˈpleznt","friendly and easy to be with","жағымды","приятный","He had to arrive on time and be reasonably pleasant to people."],
"easy-going":["ˌiːzi ˈɡəʊɪŋ","relaxed, and not easily upset or annoyed","байсалды","спокойный, лёгкий в общении","Do you prefer a very strict or a very easy-going teacher?"],
"full-time":["ˌfʊl ˈtaɪm","working the whole of a normal working week","толық жұмыс күні","на полную ставку","He is a full-time international business speaker."],
"spare":["speə","to be able to give somebody time or money; extra and not being used","бөле алу; қосымша","уделить; запасной","Can you spare the time to go for a run this afternoon?"],
"instructor":["ɪnˈstrʌktə","a person whose job is to teach a practical skill","нұсқаушы","инструктор","The instructor shouted, &lsquo;Faster! Faster!&rsquo;"],
"expert":["ˈekspɜːt","a person with special knowledge of a subject","сарапшы","эксперт","They send someone with no experience and train them with an expert."],
"leader":["ˈliːdə","a person who is in charge of a group","көшбасшы","лидер, руководитель","Audrey is a good leader."],
"panel":["ˈpænl","a small group of people chosen to judge or decide something","алқа","жюри, комиссия","A panel of judges decides who wins."],
"technique":["tekˈniːk","a particular way of doing something practical","әдіс","техника, приём","Did he explain what his technique was?"],
"respect":["rɪˈspekt","to admire somebody and think well of them","құрметтеу","уважать","He couldn&rsquo;t say please and thank you if he wanted the team to respect him."],
"responsibility":["rɪˌspɒnsəˈbɪləti","a duty to deal with something or to look after something","жауапкершілік","ответственность","You must take responsibility for your actions."],
"stress":["stres","the worried feeling you get when life is too difficult","күйзеліс","стресс","The Social Stress Test is a way of measuring stress."],
"stressful":["ˈstresfl","causing a lot of worry and pressure","күйзелісті","стрессовый","Speaking in front of a large group is one of the most stressful things you can do."],
"shocked":["ʃɒkt","very surprised and upset by something","таңғалған","шокированный","Ed was shocked to realize that he couldn&rsquo;t say please all the time."],
"hobby":["ˈhɒbi","something you enjoy doing in your free time","әуесқойлық","хобби","A new hobby gives us something to talk about with friends and family."],
"passion":["ˈpæʃn","a very strong interest in something you love","құштарлық","страсть, увлечение","He has a passion for food."],
"van":["væn","a vehicle for carrying goods, smaller than a lorry","шағын жүк көлігі","фургон","Jack works in a fast-food van in all weathers."],
"good-looking":["ˌɡʊd ˈlʊkɪŋ","attractive to look at","келбетті","привлекательный","I think he&rsquo;s very good-looking."],
"left-handed":["ˌleft ˈhændɪd","using the left hand more easily than the right","солақай","левша","Did you know that Karen is left-handed?"],
"short-sleeved":["ˌʃɔːt ˈsliːvd","with sleeves that end above the elbow","қысқа жеңді","с коротким рукавом","I&rsquo;m going to wear a short-sleeved shirt to work today."],
"second-hand":["ˌsekənd ˈhænd","not new; owned by somebody else before","қолданылған","подержанный","Have you ever bought a second-hand car?"],
"English-speaking":["ˈɪŋɡlɪʃ ˌspiːkɪŋ","where English is the language people speak","ағылшын тілді","англоговорящий","Can you name five English-speaking countries?"],
"five-star":["ˌfaɪv ˈstɑː","of the highest quality, especially a hotel","бес жұлдызды","пятизвёздочный","Have you ever stayed in a five-star hotel?"],
"device":["dɪˈvaɪs","a piece of equipment made to do a particular job","құрылғы","устройство","All these devices are constantly developing."],
"flip":["flɪp","to turn something over quickly","аудару","переворачивать","When the first side is cooked, you flip it over."],
"crack":["kræk","to break the shell of an egg, or to break something hard","сындыру","разбивать","Then you crack an egg into the bowl."],
"rub":["rʌb","to move your hand or another object backwards and forwards on a surface","ысқылау","тереть","Next, rub the bottle with sandpaper."],
"overcook":["ˌəʊvəˈkʊk","to cook something for too long","артық пісіру","переварить, пережарить","The vegetables were overcooked."],
"overpriced":["ˌəʊvəˈpraɪst","costing much more than it is worth","бағасы шамадан тыс","слишком дорогой","When was the last time you thought something was overpriced?"],
"computerized":["kəmˈpjuːtəraɪzd","controlled or operated by a computer","компьютерленген","компьютеризированный","Computerized household appliances are an essential part of everyday life."],
"deal with":["ˈdiːl wɪð","to take action to solve a problem","шешу","справляться, решать","The successful children dealt with the problem by looking away."],
"decision":["dɪˈsɪʒn","a choice you make after thinking about it","шешім","решение","An important member of the team is someone who can make decisions."],
"fail":["feɪl","to not succeed in doing something","сәтсіздікке ұшырау","провалиться, не суметь","How many of them failed the test?"],
"talk":["tɔːk","a short speech given to a group of people","баяндама","доклад, выступление","Have you ever given a talk to a large group of people?"],
"turn up":["ˌtɜːn ˈʌp","to arrive somewhere, especially for work","келу","приходить, являться","Ed had to be reliable and turn up for work on time."],
"canal":["kəˈnæl","a long narrow area of water made by people for boats","канал","канал","The Thai capital, Bangkok, has many canals."],
"cliff":["klɪf","a high steep area of rock, usually by the sea","жартас","утёс, скала","You could sit underneath the waterfalls coming down the cliffs."],
"landscape":["ˈlændskeɪp","everything you can see when you look across an area of land","ландшафт","ландшафт, пейзаж","I don&rsquo;t think I&rsquo;ve ever seen such a beautiful and unusual landscape."],
"scenery":["ˈsiːnəri","the natural features of an area, seen as something beautiful","табиғат көрінісі","пейзаж, виды","As I came out of the trees, I could see the beautiful scenery."],
"mainland":["ˈmeɪnlænd","the main area of land of a country, not its islands","негізгі құрлық","материк, большая земля","There are daily ferries to the mainland."],
"inland":["ɪnˈlænd","away from the coast, towards the middle of a country","құрлық ішіне қарай","вглубь страны","Those who can&rsquo;t move inland are starting to consider moving out to sea."],
"suburb":["ˈsʌbɜːb","an area where people live outside the centre of a city","қала маңы","пригород","Do you live in the suburbs?"],
"valley":["ˈvæli","the low land between two hills or mountains","аңғар","долина","I could see the most amazing deep green valleys."],
"peak":["piːk","the pointed top of a mountain","шың","вершина","I could see the mountain peaks and the deep green valleys."],
"steep":["stiːp","rising or falling sharply, not gradually","тік","крутой","The path was pretty steep."],
"rock":["rɒk","the hard material that mountains are made of, or a large piece of it","жартас","скала, камень","The landscape had the most amazing rocks."],
"pool":["puːl","a small area of still water","шағын көлшік","заводь, водоём","In between the rocks were lots of clear pools for swimming."],
"cubicle":["ˈkjuːbɪkl","a very small room or space with walls around it","кабина","кабинка","The shampoo is in the shower cubicle."],
"communal":["kəˈmjuːnl","shared by a group of people","ортақ","общий, коммунальный","Every block of flats has a communal garden."],
"permanent":["ˈpɜːmənənt","lasting for a long time, or for ever","тұрақты","постоянный","He&rsquo;s choosing a permanent home."],
"inhabitant":["ɪnˈhæbɪtənt","a person who lives in a particular place","тұрғын","житель","By 2030, eighteen cities will have more than twenty million inhabitants."],
"feel at home":["ˌfiːl ət ˈhəʊm","to feel comfortable and relaxed somewhere","өз үйіндегідей сезіну","чувствовать себя как дома","I feel at home in my new job already."],
"make room":["meɪk ˈruːm","to move things so that there is space for somebody or something","орын босату","освободить место","I&rsquo;m sure we can make room for one more person."],
"set off":["set ˈɒf","to start a journey","жолға шығу","отправляться","It was the end of September, and quite a cold, grey day, as I set off."],
"settle down":["ˌsetl ˈdaʊn","to start living a quiet, permanent life in one place","бір жерге орнығу","остепениться, осесть","I didn&rsquo;t want to settle down until I was 35."],
"packed like sardines":["pækt laɪk sɑːˈdiːnz","pressed together with no space at all","қысылып-қымтырылып","как сельди в бочке","It&rsquo;s awful, we&rsquo;re packed like sardines on the Tube."],
"miles from anywhere":["maɪlz frəm ˈeniweə","very far from any town or village","алыс шетте","на отшибе, вдали от всего","Well, actually we live miles from anywhere."],
"greenery":["ˈɡriːnəri","green leaves and plants, seen together","жасыл желек","зелень","There was plenty of greenery, but also the most amazing rocks."],
"ocean":["ˈəʊʃn","one of the very large areas of sea on the earth","мұхит","океан","Why do so many people want to live in the middle of the ocean?"],
"wave":["weɪv","a line of raised water that moves across the surface of the sea","толқын","волна","I love walking on the sandy beaches and looking at the waves."],
"sunset":["ˈsʌnset","the time when the sun goes down, and the colours in the sky then","күн батуы","закат","I think the most incredible thing was the sunset."],
"sunshine":["ˈsʌnʃaɪn","the light and heat that come from the sun","күн шуағы","солнечный свет","The park was full of people enjoying the sunshine."],
"season":["ˈsiːzn","one of the four parts of the year","маусым","время года, сезон","Autumn is perhaps the most beautiful season."],
"culture":["ˈkʌltʃə","the way of life of a particular group of people","мәдениет","культура","There are already cultures where a life on water is nothing new."],
"mixture":["ˈmɪkstʃə","a combination of different things","қоспа","смесь, сочетание","It&rsquo;s a mixture of historic buildings and natural beauty."],
"artificial":["ˌɑːtɪˈfɪʃl","made by people, not existing naturally","жасанды","искусственный","The company will develop artificial islands for the Maldives."],
"historic":["hɪˈstɒrɪk","important in history, or very old","тарихи","исторический","It&rsquo;s a mixture of historic buildings and natural beauty."],
"chemical":["ˈkemɪkl","a substance used in or produced by chemistry","химиялық зат","химическое вещество","It seems that the trees give off chemicals which help to keep you healthy."],
"get rid of":["ɡet ˈrɪd əv","to throw away or remove something you do not want","құтылу","избавиться от","We need to get rid of some of our books &mdash; we have too many."],
"run out of":["rʌn ˈaʊt əv","to have no more of something left","таусылу","закончиться (о запасе)","I agree. We&rsquo;ve run out of space here!"],
"give off":["ɡɪv ˈɒf","to produce a smell, heat, light or a substance","бөліп шығару","выделять, испускать","It seems that the trees give off chemicals which help to keep you healthy."],
"globalization":["ˌɡləʊbəlaɪˈzeɪʃn","the way countries and economies are becoming connected worldwide","жаһандану","глобализация","The project is all about globalization."],
"aspiring":["əˈspaɪərɪŋ","hoping to become successful at something","талпынушы","начинающий, стремящийся стать","Are you an aspiring travel writer?"],
"neat and tidy":["ˌniːt ən ˈtaɪdi","clean and with everything in the right place","жинақы","аккуратный, в порядке","I like to keep my living space neat and tidy."],
"enquiry":["ɪnˈkwaɪəri","a question you ask in order to get information","сұрау салу","запрос, справка","I am writing to make an enquiry about your summer courses."],
"available":["əˈveɪləbl","able to be used, bought or found","қолжетімді","доступный, свободный","The courses available are for different levels of ability."],
"book":["bʊk","to arrange to have a room, seat or table kept for you","броньдау","бронировать","Could you tell me whether I need to book in advance?"],
"confirm":["kənˈfɜːm","to say officially that something is now certain","растау","подтверждать","I&rsquo;ll check my diary and will confirm later."],
"cost":["kɒst","the amount of money you have to pay for something","құны","стоимость","Could you tell me what the total cost would be?"],
"include":["ɪnˈkluːd","to have something as one of its parts","қамту","включать","I&rsquo;d be grateful if you could tell me what the price includes."],
"per":["pɜː","for each","бірлігіне","за (единицу)","How much is it per person, per night?"],
"genre":["ˈʒɒnrə","a style or type of film, book or music","жанр","жанр","What genre of film do you prefer?"],
"plot":["plɒt","the series of events that make up a story","сюжет","сюжет","The plot is quite difficult to follow."],
"cast":["kɑːst","all the actors in a film or play","актёрлар құрамы","актёрский состав","There are several very good actors in the cast."],
"character":["ˈkærəktə","a person in a film, book or play","кейіпкер","персонаж","He plays the part of the main character in the film."],
"scene":["siːn","one short part of a film, in one place","көрініс","сцена","Some of the scenes were filmed in Iceland."],
"soundtrack":["ˈsaʊndtræk","the music that goes with a film","саундтрек","саундтрек","Thomas Newman&rsquo;s soundtrack creates an exciting atmosphere."],
"special effects":["ˌspeʃl ɪˈfekts","images or sounds created by a computer for a film","арнайы әсерлер","спецэффекты","There are some amazing special effects."],
"documentary":["ˌdɒkjuˈmentri","a film about real people or real events","деректі фильм","документальный фильм","I watched an interesting documentary on TV this week."],
"thriller":["ˈθrɪlə","an exciting film or book about crime or danger","триллер","триллер","Do you like thrillers?"],
"romcom":["ˈrɒm kɒm","a funny film about people falling in love","романтикалық комедия","романтическая комедия","This film is a romcom."],
"animated":["ˈænɪmeɪtɪd","made using drawings or computer images that move","анимациялық","анимационный","Rio 2096 is an animated film."],
"classic":["ˈklæsɪk","a film or book that is still admired many years later","классика","классика","It has become a modern classic."],
"novel":["ˈnɒvl","a long written story","роман","роман","The film is based on a novel by Stephen King."],
"moving":["ˈmuːvɪŋ","causing strong feelings, especially sadness","әсерлі","трогательный","Freeman&rsquo;s performance is very moving."],
"disturbing":["dɪˈstɜːbɪŋ","making you feel worried or upset","мазасыздандыратын","тревожный","It is a disturbing future where poor people can&rsquo;t afford water."],
"predictable":["prɪˈdɪktəbl","happening exactly as you expected, so not interesting","болжауға болатын","предсказуемый","The game was good, although it was quite predictable."],
"entertaining":["ˌentəˈteɪnɪŋ","amusing and enjoyable","көңілді","увлекательный","It was the most entertaining game I&rsquo;ve ever played."],
"stunning":["ˈstʌnɪŋ","extremely beautiful or impressive","таңғажайып","потрясающий","The film is both visually stunning and truly moving."],
"terrific":["təˈrɪfɪk","excellent, very good indeed","тамаша","отличный","<i>The Shawshank Redemption</i> is terrific entertainment."],
"original":["əˈrɪdʒənl","new and different from anything before","өзгеше","оригинальный","He&rsquo;s a character in an original new video game."],
"showcase":["ˈʃəʊkeɪs","to show the best qualities of something to other people","көрсету","демонстрировать","It is designed to showcase African culture to the world."],
"base on":["ˈbeɪs ɒn","to use something as the starting point for a film or book","негіздеу","основывать на","The film is based on a novel by Stephen King."],
"set out":["set ˈaʊt","to start a journey, especially a long one","жолға шығу","отправиться в путь","He decides to set out on a journey to find a missing negative."],
"recommend":["ˌrekəˈmend","to tell somebody that something is good and they should try it","ұсыну","рекомендовать","I highly recommend it to everyone."],
"release":["rɪˈliːs","to make a film or record available to the public","шығару","выпускать","Despite failing at the box office when it was originally released, it is now a classic."],
"hope":["həʊp","to want something to happen and think it is possible","үміттену","надеяться","He hopes to be with Janaina once more."],
"tend":["tend","to usually do something, as a habit","бейім болу","иметь тенденцию","I tend to check emails and messages while I watch."],
"topic":["ˈtɒpɪk","the subject of a talk, a piece of writing or a discussion","тақырып","тема","We asked Paul to choose a topic he found really interesting."],
"interact":["ˌɪntərˈækt","to talk to and do things with other people","өзара әрекеттесу","взаимодействовать","The more ways we have to interact with people the better."],
"hand-held":["ˈhændheld","small enough to be held in one hand","қолға ұстайтын","портативный","A second screen can be a tablet, a laptop or a hand-held gaming unit."],
"login":["ˈlɒɡɪn","the act of connecting to a website or a system","жүйеге кіру","вход в систему","Most of its fans login from Brazil, India and the US."],
"addicted":["əˈdɪktɪd","unable to stop doing something you enjoy","тәуелді","зависимый","I hadn&rsquo;t realized that you could become addicted to your screen."],
"appeal":["əˈpiːl","the quality that makes people like something","тартымдылық","привлекательность","In fact, the games do seem to have a world-wide appeal."],
"atmosphere":["ˈætməsfɪə","the feeling that a place or a piece of music gives you","атмосфера","атмосфера","The soundtrack creates an exciting atmosphere throughout the film."],
"authentic":["ɔːˈθentɪk","real and true, not a copy","шынайы","настоящий, аутентичный","Agus&rsquo;s family would love to eat at an authentic Indonesian restaurant."],
"accessible":["əkˈsesəbl","easy to reach, use or get","қолжетімді","доступный","It&rsquo;s absolutely essential that we are accessible all the time."],
"chat":["tʃæt","to talk to somebody in a friendly, informal way, especially online","әңгімелесу","общаться, переписываться","My daughter spends her days chatting online."],
"fan":["fæn","somebody who likes a person, team or thing very much","жанкүйер","фанат, поклонник","Most of its fans log in from Brazil, India and the US."],
"fantasize":["ˈfæntəsaɪz","to imagine something pleasant that is unlikely to happen","қиялдау","мечтать, фантазировать","Mei fantasizes about becoming an actress."],
"grow apart":["ˌɡrəʊ əˈpɑːt","to slowly become less close to somebody","алыстап кету","отдаляться друг от друга","They meet at university and become friends; however, they grow apart for the next few years."],
"harmless":["ˈhɑːmləs","not able to cause any damage","зиянсыз","безобидный","It&rsquo;s terrible that something that looks as harmless as a video game can have such an effect."],
"mug":["mʌɡ","to attack somebody in the street and steal from them","көшеде тонау","ограбить на улице","I haven&rsquo;t been mugged yet, but my friend has."],
"silly":["ˈsɪli","not sensible; a bit stupid","ақымақ","глупый","I thought it was really silly."],
"sweep across":["ˈswiːp əˌkrɒs","to spread quickly across a large area","қамту","охватывать, распространяться","Nigerian movies and music are sweeping across the continent."],
"vote":["vəʊt","to choose somebody or something officially","дауыс беру","голосовать","We want you to vote for your favourite film of all time."],
"world-wide":["ˌwɜːld ˈwaɪd","happening or known all over the world","дүниежүзілік","всемирный","The games do seem to have a world-wide appeal."],
"prisoner":["ˈprɪznə","a person who is being kept in a prison","тұтқын","заключённый","He soon makes friends with another prisoner."],
"slavery":["ˈsleɪvəri","the system of owning people and forcing them to work","құлдық","рабство","We then see the couple living through slavery in 1825."],
"military":["ˈmɪlətri","connected with soldiers and the army","әскери","военный","The film shows the couple living through military dictatorship in 1970."],
"pothole":["ˈpɒthəʊl","a hole in the surface of a road","шұңқыр","яма на дороге","He dashes through the streets of Lagos, avoiding cars, trucks and potholes."],
"skyscraper":["ˈskaɪskreɪpə","a very tall building in a city","аспан тіреген үй","небоскрёб","A man and a woman stand at the top of a skyscraper in the middle of the night."],
"exhibition":["ˌeksɪˈbɪʃn","a public show of art or other objects","көрме","выставка","I&rsquo;ve been to the theatre three times, as well as to a number of art exhibitions."],
"performance":["pəˈfɔːməns","the acting or playing of one person in a film or a concert","ойын, орындау","игра, исполнение","His performance in the film is the best."],
"disappointing":["ˌdɪsəˈpɔɪntɪŋ","not as good as you hoped","көңіл қалдыратын","разочаровывающий","I thought the game was rather disappointing."],
"dreadful":["ˈdredfl","extremely bad","сұмдық жаман","ужасный","And the traffic &mdash; it&rsquo;s dreadful."],
"terrifying":["ˈterɪfaɪɪŋ","making you very frightened","қорқынышты","пугающий","It was a terrifying experience."],
"unexciting":["ˌʌnɪkˈsaɪtɪŋ","dull; not interesting at all","қызықсыз","скучный","It&rsquo;s a pretty unexciting game, really."],
"amusing":["əˈmjuːzɪŋ","funny and enjoyable","көңілді","забавный","Maliyo aims to produce something clever, amusing and definitely African."],
"infuriating":["ɪnˈfjʊərieɪtɪŋ","extremely annoying","ашуландыратын","бесящий","It&rsquo;s absolutely infuriating."],
"irritation":["ˌɪrɪˈteɪʃn","something small that keeps annoying you","мазасыздық","раздражение","The only things that get hurt are the mosquitos, a constant irritation in Lagos."],
"violent":["ˈvaɪələnt","involving people hurting each other","зорлықты","жестокий","It can also be quite a violent place."],
"astonishing":["əˈstɒnɪʃɪŋ","extremely surprising","таңғаларлық","поразительный","Last year Nigerians bought an astonishing 21.5 million mobile phones."],
"brilliant":["ˈbrɪliənt","extremely good","керемет","блестящий, отличный","Although the film is a little slow, the end is absolutely brilliant."],
"incredibly":["ɪnˈkredəbli","extremely; used before a normal adjective","керемет","невероятно","It&rsquo;s incredibly expensive."],
"absolutely":["ˈæbsəluːtli","completely; used before an extreme adjective","мүлдем","абсолютно","I&rsquo;m absolutely exhausted."],
"essentially":["ɪˈsenʃəli","in the most important way; basically","негізінен","по сути","The film is sad in places, but essentially it is a positive story."],
"magically":["ˈmædʒɪkli","in a way that cannot be explained, as if by magic","сиқырлы түрде","волшебным образом","In the film, he magically turns into a bird."],
"falsely":["ˈfɔːlsli","wrongly; because of something untrue","жалған түрде","ложно, ошибочно","He plays a banker who is falsely sent to prison for killing his wife."],
"modern-day":["ˈmɒdn deɪ","existing now, in our own time","қазіргі","современный","The second screen is part of modern-day life, especially for young people."],
"middle class":["ˌmɪdl ˈklɑːs","the group of people between the richest and the poorest","орта тап","средний класс","A growing middle class is looking for entertainment."],
"despite":["dɪˈspaɪt","in spite of; even though something is true","қарамастан","несмотря на","Despite failing at the box office, the film has become popular."],
"on balance":["ɒn ˈbæləns","after thinking about both sides","бәрін ескергенде","в целом, взвесив всё","On balance, I don&rsquo;t think I want to live anywhere else."],
"dash":["dæʃ","to run somewhere very quickly","жүгіру","мчаться","He makes a living by dashing through the streets of Lagos."],
"voice":["vɔɪs","to speak the words of a character in an animated film","дауыстау","озвучивать","The main characters are voiced by Brazilian actors."],
"amazing":["əˈmeɪzɪŋ","extremely surprising and very good","таңғажайып","потрясающий","She was absolutely amazed when she saw her sister at the door."],
"awful":["ˈɔːfl","extremely bad or unpleasant","сұмдық","ужасный","This particular model was never stylish. It&rsquo;s just awful."],
"exhausted":["ɪɡˈzɔːstɪd","extremely tired","қалжыраған","измотанный","I can&rsquo;t walk any further. I&rsquo;m absolutely exhausted."],
"freezing":["ˈfriːzɪŋ","extremely cold","мұздай суық","очень холодный","Put the heater on. It&rsquo;s absolutely freezing in here."],
"tiny":["ˈtaɪni","extremely small","кішкентай","крошечный","The flat was absolutely tiny &mdash; one room and a window."],
"driverless":["ˈdraɪvələs","able to drive without a person controlling it","жүргізушісіз","беспилотный","Driverless cars are already on the roads in California."],
"drone":["drəʊn","a small flying machine with no pilot on board","дрон","дрон","Amazon promises robot drones which will deliver our packages."],
"instant messaging":["ˌɪnstənt ˈmesɪdʒɪŋ","sending short written messages that arrive at once","лездік хабар алмасу","мгновенные сообщения","We use instant messaging more than we use the phone."],
"automatically":["ˌɔːtəˈmætɪkli","by itself, without a person doing anything","автоматты түрде","автоматически","Many cars automatically brake when the car needs to slow down."],
"at speed":["ət ˈspiːd","moving very fast","жоғары жылдамдықпен","на большой скорости","Driverless cars will be able to drive at speed much closer to each other."],
"brake":["breɪk","to slow a vehicle down or stop it","тежеу","тормозить","The car brakes automatically when it needs to slow down."],
"junction":["ˈdʒʌŋkʃn","a place where two roads meet","қиылыс","перекрёсток","The cars can communicate with traffic lights as they approach junctions."],
"lane":["leɪn","one of the parts a wide road is divided into","жолақ","полоса движения","It warns the driver if they are slipping out of the correct lane."],
"motorway":["ˈməʊtəweɪ","a wide fast road for long journeys","автобан","автомагистраль","Driving along the motorway in busy traffic, the driver presses a button."],
"overtake":["ˌəʊvəˈteɪk","to pass a vehicle that is going in the same direction","басып озу","обгонять","Fast broadband allows them to overtake other cars safely."],
"commute":["kəˈmjuːt","to travel regularly between home and work","қатынау","ездить на работу","The people who commute for a living will notice first."],
"driving test":["ˈdraɪvɪŋ test","the official test you take before you are allowed to drive","жүргізуші емтиханы","экзамен на права","She passed her driving test at the third attempt."],
"speed limit":["ˈspiːd lɪmɪt","the fastest you are legally allowed to drive","жылдамдық шегі","ограничение скорости","Google&rsquo;s driverless car sticks to the speed limit and doesn&rsquo;t get tired."],
"accident":["ˈæksɪdənt","an unpleasant event in which people are hurt or things are damaged","апат","авария, несчастный случай","Ninety per cent of road accidents are caused by human error."],
"injure":["ˈɪndʒə","to hurt somebody physically","жарақаттау","травмировать","More than fifty million people die or are injured in road accidents every year."],
"park":["pɑːk","to leave a vehicle in a place for a time","қою","парковать","Many cars can already park themselves by the side of the road."],
"possession":["pəˈzeʃn","something that you own","мүлік","имущество, вещь","My phone is the possession I would least like to lose."],
"practical":["ˈpræktɪkl","useful and sensible in a real situation","тәжірибелі","практичный","It is a practical machine rather than an imaginative one."],
"imaginative":["ɪˈmædʒɪnətɪv","full of new and interesting ideas","қиялшыл","творческий","Machines are not yet imaginative, and that is the difference."],
"in control":["ɪn kənˈtrəʊl","able to decide what happens","бақылауда","под контролем","As soon as I get behind the wheel, I feel in control."],
"replaceable":["rɪˈpleɪsəbl","able to be replaced by something or somebody else","алмастыруға болатын","заменимый","Workers with low-level skills are the most easily replaceable."],
"washable":["ˈwɒʃəbl","able to be washed without being damaged","жууға болатын","моющийся","The cover is washable, which is useful with small children."],
"unemployable":["ˌʌnɪmˈplɔɪəbl","not able to get a job, because of a lack of skills","жұмысқа жарамсыз","непригодный к работе","Those who don&rsquo;t have high-level skills risk being unemployable."],
"skill":["skɪl","the ability to do something well, learned through practice","дағды","навык","Only people whose skills are better than the machines&rsquo; abilities will have work."],
"disability":["ˌdɪsəˈbɪləti","a physical or mental condition that limits what somebody can do","мүгедектік","инвалидность","Driverless cars could give people with a disability real independence."],
"helpless":["ˈhelpləs","not able to look after yourself or do anything about a situation","дәрменсіз","беспомощный","Without my phone I feel completely helpless."],
"climate change":["ˈklaɪmət tʃeɪndʒ","the long-term change in the earth&rsquo;s weather patterns","климаттың өзгеруі","изменение климата","Many scientists agree that climate change has been causing higher temperatures."],
"cloud seeding":["ˈklaʊd siːdɪŋ","putting chemicals into the air to make rain","бұлтты тұқымдау","засев облаков","The best-known method is called cloud seeding."],
"weather pattern":["ˈweðə pætn","the way the weather usually behaves over a period","ауа райы үлгісі","погодные закономерности","These changes in weather patterns have been happening as a result of global warming."],
"meteorological":["ˌmiːtiərəˈlɒdʒɪkl","connected with the study of the weather","метеорологиялық","метеорологический","The meteorological office issued a warning that morning."],
"extreme":["ɪkˈstriːm","much greater than usual","шектен тыс","экстремальный","Recently there seem to have been a lot of extreme weather events."],
"heatwave":["ˈhiːtweɪv","a period of unusually hot weather","аптап ыстық","аномальная жара","The heatwave lasted for three weeks."],
"drought":["draʊt","a long period with no rain","құрғақшылық","засуха","Why do we still have problems with droughts?"],
"rainfall":["ˈreɪnfɔːl","the amount of rain that falls in a place","жауын-шашын","количество осадков","Heavy rainfall caused landslides across the region."],
"landslide":["ˈlændslaɪd","a mass of earth and rock falling down a slope","көшкін","оползень","Heavy rainfall caused landslides across the region."],
"fire":["ˈfaɪə","burning that destroys buildings, forests or land","өрт","пожар","Long dry summers make forest fires far more likely."],
"dusty":["ˈdʌsti","covered with dry earth or dust","шаңды","пыльный","After the drought the fields were dry and dusty."],
"crop":["krɒp","a plant grown by farmers for food","егін","урожай, культура","The drought caused serious crop damage."],
"tropical":["ˈtrɒpɪkl","from or in the hottest parts of the world","тропикалық","тропический","Hurricanes form in warm, tropical waters."],
"seasonal":["ˈsiːzənl","happening only at one time of the year","маусымдық","сезонный","The rain here is seasonal &mdash; almost all of it falls in April."],
"increase":["ˈɪŋkriːs","a rise in the amount or number of something","өсу","рост, увеличение","In recent years there has been a noticeable increase in extreme weather events."],
"decrease":["dɪˈkriːs","to become smaller in number or amount","азаю","уменьшаться","Rainfall has decreased by nearly a third since the 1990s."],
"prevent":["prɪˈvent","to stop something from happening","алдын алу","предотвращать","We should try to prevent further warming by reducing pollution."],
"protect":["prəˈtekt","to keep somebody or something safe from harm","қорғау","защищать","We should reduce pollution and protect trees."],
"explore":["ɪkˈsplɔː","to examine an idea or a place carefully in order to learn about it","зерттеу","исследовать","Scientists have been exploring another method."],
"nowadays":["ˈnaʊədeɪz","at the present time, in contrast with the past","қазіргі кезде","в наши дни","Nowadays almost every summer breaks a record somewhere."],
"correspondent":["ˌkɒrəˈspɒndənt","a journalist who reports on one subject or from one place","тілші","корреспондент","With us in the studio we have Neil Clough, our science correspondent."],
"crew":["kruː","the people who work on a ship, plane or film","экипаж","экипаж, команда","Rolls-Royce says robo-ships, which won&rsquo;t need any crew, will soon be sailing."],
"contract":["ˈkɒntrækt","an official written agreement","келісімшарт","контракт","The research team signed a five-year contract with the university."],
"artificially":["ˌɑːtɪˈfɪʃəli","not naturally; by human action","жасанды түрде","искусственно","Scientists have been trying to artificially control or change the weather."],
"basically":["ˈbeɪsɪkli","in the most important way; put simply","негізінен","в основном, по сути","Basically, the method puts chemicals into the air to encourage rain."],
"cheerful":["ˈtʃɪəfl","happy, and showing it","көңілді","жизнерадостный","She is one of the most cheerful people I know."],
"musical":["ˈmjuːzɪkl","good at music, or connected with music","музыкалық","музыкальный","He comes from a very musical family."],
"sociable":["ˈsəʊʃəbl","enjoying being with other people","қауымшыл","общительный","She&rsquo;s far more sociable than her brother."],
"traditional":["trəˈdɪʃənl","following what has been done for a long time","дәстүрлі","традиционный","This is the traditional way of predicting the weather here."],
"interrupt":["ˌɪntəˈrʌpt","to say something while somebody else is speaking","сөзін бөлу","перебивать","Sorry to interrupt, but there&rsquo;s been a change of plan."],
"in charge":["ɪn ˈtʃɑːdʒ","having control of something or somebody","жауапты","главный, ответственный","Your car is now in charge."],
"slip out":["ˌslɪp ˈaʊt","to leave a place quietly for a short time","байқатпай шығу","выскользнуть, отлучиться","I&rsquo;ll try to slip out of the meeting for ten minutes."],
"wages":["ˈweɪdʒɪz","money paid for work, usually every week","жалақы","заработная плата","They will have to work for very low wages."],
"social":["ˈsəʊʃl","connected with meeting people and spending time with them","әлеуметтік","социальный, общественный","It&rsquo;s a social lunch, not a work meeting."],
"occupation":["ˌɒkjuˈpeɪʃn","a person&rsquo;s job or profession","кәсіп","род занятий, профессия","Changing your occupation halfway through life would have seemed strange to him."],
"lifestyle":["ˈlaɪfstaɪl","the way a person or group lives","өмір салты","образ жизни","People moved abroad in search of a different lifestyle."],
"lifetime":["ˈlaɪftaɪm","the whole of a person&rsquo;s life","өмір бойы","целая жизнь","A job you kept for a lifetime gave you a reputation."],
"working conditions":["ˈwɜːkɪŋ kənˌdɪʃnz","the hours, pay and surroundings of a job","еңбек жағдайлары","условия труда","The working conditions are much better here than in Lisbon."],
"rule":["ruːl","an official statement of what you must or must not do","ереже","правило","There were rules, and you obeyed them."],
"obey":["əˈbeɪ","to do what a rule or a person tells you to do","бағыну","подчиняться","At work, is it better to obey the rules or to take risks?"],
"quit":["kwɪt","to leave a job, usually by choice","жұмыстан кету","уволиться","You didn&rsquo;t quit a job unless something had gone badly wrong."],
"temporary":["ˈtemprəri","lasting only for a short time","уақытша","временный","The job is just temporary, for four months."],
"rent-free":["ˌrent ˈfriː","with no rent to pay","жалдау ақысыз","без арендной платы","The job came with rent-free accommodation in a beautiful apartment."],
"relaxed":["rɪˈlækst","calm, and not worried about rules or time","байсалды","расслабленный","The office has a much more relaxed atmosphere than my last one."],
"early":["ˈɜːli","before the usual or expected time","ерте","рано","In those days nobody left early, whatever the reason."],
"stay":["steɪ","to remain in a place or a job","қалу","оставаться","Now I&rsquo;m here, I think I&rsquo;ll stay a lot longer."],
"procedure":["prəˈsiːdʒə","the official way of doing something","рәсім","процедура, порядок","Nobody worked from home, because there was no procedure for it."],
"pattern":["ˈpætn","the regular way in which something happens","үлгі","модель, закономерность","In recent years the pattern seems to be changing."],
"entrance":["ˈentrəns","the door or gate you go in through","кіреберіс","вход","You did not disagree with the man at the entrance to the top floor."],
"festival":["ˈfestɪvl","a public event with music, food or performances","мереке","фестиваль, праздник","There was a company festival every summer."],
"entertainment":["ˌentəˈteɪnmənt","films, music or shows that people enjoy watching","көңіл көтеру","развлечение","There was entertainment for the children at the summer festival."],
"branch":["brɑːntʃ","one of the offices or shops of a large company","филиал","филиал, отделение","Everybody in the branch started at eight and left at five."],
"quality":["ˈkwɒləti","how good or bad something is","сапа","качество","The quality of life here is better, even if the salary is not."],
"value":["ˈvæljuː","how much something is worth, in money or in importance","құндылық","ценность","A reputation had a value in those days."],
"reputation":["ˌrepjuˈteɪʃn","the opinion people have of somebody or something","бедел","репутация","A job you kept for a lifetime gave you a reputation."],
"treasured":["ˈtreʒəd","kept carefully because it means a lot to you","қастерлі","заветный, дорогой","The photograph still hangs, treasured, in my mother&rsquo;s hallway."],
"unbelievable":["ˌʌnbɪˈliːvəbl","so surprising that it is hard to believe","сенгісіз","невероятный","The change in forty years is almost unbelievable."],
"high achiever":["ˌhaɪ əˈtʃiːvə","somebody who is very successful at what they do","биік нәтижелі адам","человек больших достижений","These are the questions a high achiever gets asked again and again."],
"talented":["ˈtæləntɪd","having a natural ability to do something well","талантты","талантливый","She is one of the most talented people in the team."],
"skilled":["skɪld","having the training and experience to do a job well","білікті","квалифицированный","There&rsquo;s plenty of work, both skilled and unskilled."],
"unskilled":["ˌʌnˈskɪld","not needing special training","біліктілігі жоқ","неквалифицированный","There&rsquo;s plenty of work, both skilled and unskilled."],
"champion":["ˈtʃæmpiən","the winner of a competition","чемпион","чемпион","She became world champion at the age of nineteen."],
"humanitarian":["hjuːˌmænɪˈteəriən","somebody who works to improve people&rsquo;s lives","адамгершілік қайраткері","гуманитарный деятель","He is remembered as a scientist and a humanitarian."],
"anthropologist":["ˌænθrəˈpɒlədʒɪst","a scientist who studies human societies and cultures","антрополог","антрополог","The anthropologist spent four years living with the community."],
"researcher":["rɪˈsɜːtʃə","somebody whose job is to study a subject in detail","зерттеуші","исследователь","The researchers found the same children as adults."],
"director":["dəˈrektə","somebody who is in charge of a company or a department","директор","директор","After two years I became a director."],
"executive":["ɪɡˈzekjətɪv","a senior manager in a company","басшы","руководитель, топ-менеджер","She joined the company as a junior executive in 2011."],
"producer":["prəˈdjuːsə","somebody who organizes the making of a film or programme","продюсер","продюсер","The producer decided to film the whole thing in Iceland."],
"specialist":["ˈspeʃəlɪst","somebody who knows a great deal about one subject","маман","специалист","You need a specialist, not a general adviser."],
"decision maker":["dɪˈsɪʒn ˌmeɪkə","somebody with the power to decide what happens","шешім қабылдаушы","лицо, принимающее решения","An important member of the team is a good decision maker."],
"team leader":["ˈtiːm ˌliːdə","the person in charge of a small group at work","топ жетекшісі","руководитель группы","I didn&rsquo;t agree with the team leader about the time we needed."],
"ambition":["æmˈbɪʃn","something you very much want to achieve","мақсат-мұрат","амбиция, цель","Her ambition was always to run her own company."],
"ambitious":["æmˈbɪʃəs","wanting very much to be successful","талпынысы жоғары","амбициозный","I&rsquo;m very ambitious &mdash; I&rsquo;d like to run a department one day."],
"aspect":["ˈæspekt","one part of a situation or subject","қыры","аспект, сторона","Which aspect of the job do you enjoy most?"],
"attitude":["ˈætɪtjuːd","the way you think and feel about something","көзқарас","отношение, установка","What matters most is her attitude to failure."],
"award":["əˈwɔːd","a prize given for something done well","марапат","награда, премия","He won a national award for the design."],
"fame":["feɪm","the state of being known by many people","даңқ","слава","Fame was never the point for her."],
"famous":["ˈfeɪməs","known about by a lot of people","әйгілі","знаменитый","A lot of people have heard their name &mdash; they are famous."],
"concentrate":["ˈkɒnsntreɪt","to give all your attention to one thing","зейін қою","сосредоточиться","I find it hard to concentrate with the radio on."],
"criticize":["ˈkrɪtɪsaɪz","to say what you think is wrong with somebody or something","сынау","критиковать","Nobody likes being criticized in front of the team."],
"motivate":["ˈməʊtɪveɪt","to make somebody want to do something","ынталандыру","мотивировать","What motivates you, and what stops you working well?"],
"blame":["bleɪm","to say that somebody is responsible for something bad","кінәлау","винить","She never blamed anybody else when a project failed."],
"determined":["dɪˈtɜːmɪnd","not willing to let anything stop you","табанды","решительный, упорный","Not willing to let anything stop you &mdash; that is being determined."],
"innovative":["ˈɪnəveɪtɪv","introducing new ideas and ways of doing things","жаңашыл","инновационный","The company has an innovative approach to training."],
"creative":["kriˈeɪtɪv","good at producing new ideas","шығармашыл","творческий","Do you find it easy to think creatively?"],
"bright":["braɪt","clever and quick to learn","алғыр","способный, смышлёный","She was the brightest student in her year."],
"bubbly":["ˈbʌbli","cheerful and full of energy","көңілді","жизнерадостный","He has a bubbly personality that fills the room."],
"thoughtful":["ˈθɔːtfl","thinking carefully, and thinking about other people","ойлы","вдумчивый, внимательный","She gave a slow, thoughtful answer to every question."],
"climb":["klaɪm","to go up something, using your hands and feet","өрмелеу","взбираться","He climbed his first mountain at the age of eleven."],
"flock":["flɒk","a group of birds or sheep together","үйір","стая, стадо","A flock of birds rose from the field as we passed."],
"dragonfly":["ˈdræɡənflaɪ","a long thin insect with two pairs of wings","инелік","стрекоза","She spent two years photographing a single species of dragonfly."],
"environmental":["ɪnˌvaɪrənˈmentl","connected with the natural world and protecting it","экологиялық","экологический","He now works for an environmental organization."],
"expanding":["ɪkˈspændɪŋ","getting bigger","кеңейіп жатқан","растущий, расширяющийся","She joined a small but rapidly expanding company."],
"point of view":["ˌpɔɪnt əv ˈvjuː","the way somebody thinks about a subject","көзқарас","точка зрения","Try to see it from the customer&rsquo;s point of view."],
"applicant":["ˈæplɪkənt","somebody who has formally asked for a job","үміткер","кандидат, соискатель","There were over two hundred applicants for the position."],
"apply":["əˈplaɪ","to ask formally for a job or a place","өтініш беру","подавать заявку","You&rsquo;ve applied for this job, and you want to get it."],
"application":["ˌæplɪˈkeɪʃn","a formal written request for a job or a place","өтініш","заявление, заявка","Please find my application attached."],
"position":["pəˈzɪʃn","a job in a company","лауазым","должность","I am writing to apply for the position of assistant manager."],
"assistant manager":["əˌsɪstənt ˈmænɪdʒə","the person who helps the manager and stands in for them","менеджердің көмекшісі","заместитель менеджера","I am writing to apply for the position of assistant manager."],
"management":["ˈmænɪdʒmənt","the people who run a company, or the work of running it","басшылық","руководство, управление","The role would give me my first real management experience."],
"supervise":["ˈsuːpəvaɪz","to watch over people to make sure they work properly","бақылау","контролировать, руководить","Have you ever had a job where you had to supervise other employees?"],
"networking":["ˈnetwɜːkɪŋ","meeting people who may be useful to you at work","байланыс орнату","нетворкинг","A lot of jobs are found through networking rather than adverts."],
"make progress":["ˌmeɪk ˈprəʊɡres","to move forward and get better at something","алға жылжу","добиваться прогресса","It is hard to make progress without some management experience."],
"get to the top":["ˌɡet tə ðə ˈtɒp","to reach the highest position in your field","шыңға жету","достичь вершины","Not everybody who works hard will get to the top."],
"make someone redundant":["ˌmeɪk sʌmwʌn rɪˈdʌndənt","to end somebody&rsquo;s job because it is no longer needed","қысқарту","сократить (уволить)","When I was made redundant in Athens, I couldn&rsquo;t find another job."],
"failure":["ˈfeɪljə","a lack of success","сәтсіздік","неудача","What matters most is her attitude to failure."],
"disagreement":["ˌdɪsəˈɡriːmənt","a situation in which people have different opinions","келіспеушілік","разногласие","When was the last time you had a disagreement with somebody at work?"],
"behaviour":["bɪˈheɪvjə","the way somebody acts","мінез-құлық","поведение","The interview is really about your behaviour under pressure."],
"attend":["əˈtend","to go to an event or a meeting","қатысу","посещать, присутствовать","I have been asked to attend a client presentation that morning."],
"suited":["ˈsuːtɪd","right for a particular job or purpose","лайықты","подходящий","I believe I would be well suited to this position."],
"overnight":["ˌəʊvəˈnaɪt","during the night, or very suddenly","бір түнде","за ночь; внезапно","Nobody gets to the top overnight."],
"retrain":["ˌriːˈtreɪn","to learn a new set of skills for a different job","қайта оқу","переучиваться","I have been able to retrain as a landscape designer."],
"unite":["juˈnaɪt","to join together and act as one group","біріктіру","объединять","A good leader can unite a team that disagrees."],
"up to date":["ˌʌp tə ˈdeɪt","modern, or containing the newest information","жаңартылған","актуальный, современный","Please find attached an up to date copy of my CV."],
"well known":["ˌwel ˈnəʊn","known about by many people","белгілі","известный","It is a small but well known company in the region."],
"happiness":["ˈhæpinəs","the state of being happy","бақыт","счастье","Money may not buy happiness, but a strong economy certainly helps."],
"factor":["ˈfæktə","one of the things that affects a result","фактор","фактор","The second factor is what the economy is spent on."],
"balanced":["ˈbælənst","containing the right mixture of things","теңгерімді","сбалансированный","They tend to eat a balanced diet and get plenty of exercise."],
"appreciate":["əˈpriːʃieɪt","to understand the value of something","бағалау","ценить","You only appreciate free healthcare when you have lived without it."],
"generous":["ˈdʒenərəs","willing to give money, help or time","жомарт","щедрый","A society that is generous with its time produces people who are the same."],
"reasonable":["ˈriːznəbl","fair, and not too much to ask","орынды","разумный, приемлемый","Most Danes will tell you the trade is reasonable."],
"sensible":["ˈsensəbl","showing good judgement","парасатты","благоразумный","Provided that a society is balanced and sensible, people tend to be content."],
"cosy":["ˈkəʊzi","warm, comfortable and welcoming","жайлы","уютный","There is a word, <i>hygge</i>, for a cosy meeting with friends and family."],
"content":["kənˈtent","quietly happy with what you have","риза","довольный","If people spend more than an hour travelling to work, they are generally less content."],
"economy":["ɪˈkɒnəmi","the money, industry and jobs of a country","экономика","экономика","Money may not buy happiness, but a strong economy certainly helps."],
"cost of living":["ˌkɒst əv ˈlɪvɪŋ","how much you must pay for ordinary things","өмір сүру құны","стоимость жизни","Luanda has a very high cost of living these days."],
"society":["səˈsaɪəti","people living together in an organized community","қоғам","общество","Denmark is also a very equal society."],
"cultural":["ˈkʌltʃərəl","connected with art, music, ideas and customs","мәдени","культурный","They spend much of their leisure time enjoying cultural activities."],
"educated":["ˈedʒukeɪtɪd","having had a good education","білімді","образованный","Icelandic children are still very highly educated in the end."],
"healthcare":["ˈhelθkeə","the medical services a country provides","денсаулық сақтау","здравоохранение","If a country has quite high taxes, it can provide free healthcare to everyone."],
"childcare":["ˈtʃaɪldkeə","looking after children while parents work","бала күтімі","уход за детьми","It&rsquo;s a family-friendly country, with free or very cheap childcare."],
"poverty":["ˈpɒvəti","the state of being very poor","кедейлік","бедность","The countries in the top ten don&rsquo;t have much poverty."],
"renewable":["rɪˈnjuːəbl","able to be replaced naturally, and so never used up","жаңартылатын","возобновляемый","Almost all of Iceland&rsquo;s electricity comes from renewable sources."],
"active":["ˈæktɪv","doing a lot of things, especially physical things","белсенді","активный","If people are active in work and free time, they&rsquo;ll probably be healthier."],
"adapt":["əˈdæpt","to change so that you fit a new situation","бейімделу","адаптироваться","It took me a year to adapt to the way people treat time here."],
"immediate":["ɪˈmiːdiət","happening at once, with no delay","дереу","немедленный","Money has an immediate effect on happiness, but not a lasting one."],
"rarely":["ˈreəli","almost never","сирек","редко","People here rarely worry about being ten minutes late."],
"hero":["ˈhɪərəʊ","somebody admired for doing something brave or good","батыр","герой","What makes somebody a hero rather than simply a witness?"],
"heroic":["həˈrəʊɪk","very brave","ерлік","героический","It was a heroic thing to do, and he refuses to call it that."],
"heroically":["həˈrəʊɪkli","in a very brave way","ерлікпен","героически","She acted heroically without stopping to think about it."],
"heroism":["ˈherəʊɪzəm","very brave behaviour","ерлік","героизм","He&rsquo;d be embarrassed if he knew people were talking about his heroism."],
"brave":["breɪv","willing to do something frightening","батыл","храбрый","If I were braver, I might be a firefighter."],
"selfish":["ˈselfɪʃ","thinking only about yourself","өзімшіл","эгоистичный","Walking past would have been the selfish thing to do."],
"genius":["ˈdʒiːniəs","somebody with extremely great ability","данышпан","гений","You don&rsquo;t have to be a genius to help somebody in the street."],
"bully":["ˈbʊli","to frighten or hurt somebody weaker, again and again","қорқыту","издеваться, травить","Nobody stepped in when the older boys bullied him."],
"misbehave":["ˌmɪsbɪˈheɪv","to behave badly","тәртіп бұзу","плохо себя вести","Children who misbehave are usually asking for attention."],
"misjudge":["ˌmɪsˈdʒʌdʒ","to form a wrong opinion about somebody or something","қате бағалау","неверно оценить","I completely misjudged how difficult it would be."],
"misunderstand":["ˌmɪsʌndəˈstænd","to understand something wrongly","дұрыс түсінбеу","неправильно понять","At first I misunderstood what people meant by being late."],
"culture shock":["ˈkʌltʃə ʃɒk","the confused feeling of being in a very different country","мәдени шок","культурный шок","There was a bit of culture shock at first."],
"first aid":["ˌfɜːst ˈeɪd","the help you give somebody before a doctor arrives","алғашқы көмек","первая помощь","If more people knew first aid, more people would survive."],
"firefighter":["ˈfaɪəfaɪtə","somebody whose job is to put out fires","өрт сөндіруші","пожарный","If I were braver, I might be a firefighter."],
"rescue":["ˈreskjuː","to save somebody from a dangerous situation","құтқару","спасать","He rescued a child from a burning flat and then went to work."],
"volunteer":["ˌvɒlənˈtɪə","to offer to do something without being paid","ерікті болу","добровольно вызваться","We could volunteer more if we had more time."],
"suffer":["ˈsʌfə","to experience something bad or painful","зардап шегу","страдать","Nobody suffered serious injuries, which was pure luck."],
"disaster":["dɪˈzɑːstə","a very bad event causing great damage","апат","катастрофа","In a disaster, ordinary people act before the professionals arrive."],
"explode":["ɪkˈspləʊd","to burst suddenly with great force","жарылу","взрываться","The gas tank exploded two minutes after he got everybody out."],
"fear":["fɪə","the feeling you have when you are afraid","қорқыныш","страх","Courage is not the absence of fear but acting anyway."],
"afraid":["əˈfreɪd","frightened","қорыққан","испуганный","He says he was afraid the whole time, which is the point."],
"be capable of":["biː ˈkeɪpəbl əv","to be able to do something","қабілетті болу","быть способным на","Most people are capable of more than they expect."],
"embarrassed":["ɪmˈbærəst","feeling shy or uncomfortable in front of others","ұялған","смущённый","He&rsquo;d be so embarrassed if he knew people were talking about it."],
"eye contact":["ˈaɪ ˌkɒntækt","looking directly into somebody&rsquo;s eyes","көзбе-көз байланыс","зрительный контакт","In some cultures direct eye contact is polite; in others it is not."],
"gender":["ˈdʒendə","the fact of being male or female","гендер","гендер, пол","Men and women are treated equally, regardless of gender."],
"method":["ˈmeθəd","a particular way of doing something","әдіс","метод","One common method is to gather the information and set a time limit."],
"craft":["krɑːft","an activity in which you make things with your hands","қолөнер","ремесло, рукоделие","Children spend time learning practical crafts, such as knitting."],
"knitting":["ˈnɪtɪŋ","making clothes from wool using two needles","тоқыма","вязание","In primary school they learn practical skills, such as knitting."],
"casual":["ˈkæʒuəl","relaxed and informal, especially about clothes","қарапайым","повседневный, неформальный","The dress code is casual, but not that casual."],
"formal":["ˈfɔːml","following the accepted rules for serious occasions","ресми","формальный, официальный","A job interview usually calls for something more formal."],
"appropriate":["əˈprəʊpriət","right for a particular situation","орынды","подходящий, уместный","What is appropriate depends entirely on who your audience is."],
"audience":["ˈɔːdiəns","the people watching or listening","аудитория","аудитория, публика","What is appropriate depends on who your audience is."],
"reappear":["ˌriːəˈpɪə","to appear again","қайта пайда болу","появиться снова","He disappeared into the smoke and reappeared with the child."],
"redecorate":["ˌriːˈdekəreɪt","to paint or paper a room again","қайта әрлеу","делать ремонт","We had to redecorate the whole flat after the fire."],
"reschedule":["ˌriːˈʃedjuːl","to arrange something for a different time","уақытын өзгерту","перенести (по времени)","Would it be possible to reschedule for later the same day?"],
"overspend":["ˌəʊvəˈspend","to spend more money than you should","артық жұмсау","перерасходовать","It is easy to overspend when you are unhappy."],
"undercook":["ˌʌndəˈkʊk","to cook something for too little time","піспей қалу","недоварить","The shark was fine; it was the potatoes he undercooked."],
"underdressed":["ˌʌndəˈdrest","not dressed formally enough for the occasion","киімі жеңіл","одетый слишком просто","I arrived in jeans and felt completely underdressed."],
"bring up":["ˌbrɪŋ ˈʌp","to look after a child until they are an adult","тәрбиелеу","воспитывать","She brought up three children while working full time."],
"stay up":["ˌsteɪ ˈʌp","to go to bed later than usual","ұйықтамай отыру","не ложиться спать","Don&rsquo;t stay up the night before you give a talk."],
"spectacularly":["spekˈtækjələli","in a very impressive or very extreme way","керемет","впечатляюще","The first version of the talk failed spectacularly."],
"extremely":["ɪkˈstriːmli","very, to a great degree","өте","чрезвычайно","Making decisions under stress is extremely unreliable."],
"burning":["ˈbɜːnɪŋ","on fire","жанып жатқан","горящий","He carried the child out of a burning building."],
"pram":["præm","a small bed on wheels for pushing a baby in","арба","коляска","Outside any café you&rsquo;ll see babies sleeping in prams."],
"neighbour":["ˈneɪbə","somebody who lives near you","көрші","сосед","Forty per cent of Danes do voluntary work, helping their neighbours."],
"risk":["rɪsk","the chance that something bad will happen","тәуекел","риск","Every decision carries some risk, including the decision to wait."],
"risky":["ˈrɪski","involving the chance of something bad happening","қауіпті","рискованный","I wouldn&rsquo;t do a job if it were risky or dangerous."],
"appearance":["əˈpɪərəns","the way somebody or something looks","сыртқы келбет","внешность","We describe our own appearance far less kindly than others do."],
"beauty":["ˈbjuːti","the quality of being very attractive to look at","сұлулық","красота","The campaign was about who decides what beauty is."],
"curly":["ˈkɜːli","having curls; not straight","бұйра","кудрявый","Her hair is curly, not straight at all."],
"spiky":["ˈspaɪki","standing up in sharp points","тікенді","торчащий, ёжиком","He had short spiky hair in every photograph from that year."],
"straight":["streɪt","with no curls or curves","тік","прямой","Her hair isn&rsquo;t straight at all."],
"shoulder-length":["ˈʃəʊldə leŋθ","reaching down to the shoulders","иыққа дейін","до плеч","His hair is shoulder-length and dark brown."],
"fringe":["frɪndʒ","hair cut straight across the forehead","шаш кекілі","чёлка","She&rsquo;s got short blonde hair, with a bit of a fringe."],
"moustache":["məˈstɑːʃ","hair grown above the upper lip","мұрт","усы","He&rsquo;s got a bit of a beard and a moustache."],
"stubble":["ˈstʌbl","very short hair on a man&rsquo;s face, a day or two old","қырынбаған сақал","щетина","He&rsquo;s got dark hair and a bit of stubble on his chin."],
"clean-shaven":["ˌkliːn ˈʃeɪvn","with no beard or moustache at all","таза қырынған","гладко выбритый","He was clean-shaven in every photograph until he turned forty."],
"blonde":["blɒnd","very fair or light in colour, of hair","сары шашты","светловолосый","She&rsquo;s got short blonde hair, with a bit of a fringe."],
"grey":["ɡreɪ","between black and white in colour","сұр, ақ шашты","седой, серый","He went grey at thirty and never dyed it."],
"dye":["daɪ","to change the colour of something with a chemical","бояу","красить (волосы)","Her hair might be dyed, actually."],
"go bald":["ˌɡəʊ ˈbɔːld","to start losing the hair on your head","таздану","лысеть","Oh, and he&rsquo;s going bald. But he&rsquo;s got kind eyes."],
"eyebrow":["ˈaɪbraʊ","the line of hair above each eye","қас","бровь","His eyebrows are the first thing anybody notices."],
"eyelash":["ˈaɪlæʃ","one of the hairs on the edge of the eyelid","кірпік","ресница","She has the longest eyelashes in the family."],
"double chin":["ˌdʌbl ˈtʃɪn","loose skin under the chin, making it look like two","қос иек","второй подбородок","He looks middle-aged and he&rsquo;s got a bit of a double chin."],
"overweight":["ˌəʊvəˈweɪt","heavier than is healthy","артық салмақты","полный, с лишним весом","He&rsquo;s quite well-built, possibly a bit overweight."],
"well-built":["ˌwel ˈbɪlt","with a large, strong body","қапсағай","крепкого сложения","He&rsquo;s quite well-built, possibly a bit overweight."],
"slim":["slɪm","thin, in an attractive way","сымбатты","стройный","I think she&rsquo;s quite slim."],
"old-fashioned":["ˌəʊld ˈfæʃnd","from an earlier time; not modern","ескі үлгідегі","старомодный","She&rsquo;s wearing an old-fashioned long dress in a bright shade of red."],
"mysterious":["mɪˈstɪəriəs","strange, and difficult to explain","жұмбақ","загадочный","She&rsquo;s drinking from a blue glass bowl. It&rsquo;s really mysterious."],
"self-described":["ˌself dɪˈskraɪbd","described by the person themselves","өзі сипаттаған","самоописанный","The self-described version was far less flattering than the stranger&rsquo;s."],
"wear":["weə","to have clothes on your body","кию","носить (одежду)","She&rsquo;s wearing an old-fashioned long dress with a purple scarf."],
"suit":["suːt","to look good on somebody","жарасу","идти, быть к лицу","He&rsquo;s got a big nose, but it suits him."],
"stranger":["ˈstreɪndʒə","somebody you do not know","бейтаныс","незнакомец","The stranger&rsquo;s description was far more positive than her own."],
"description":["dɪˈskrɪpʃn","words that say what somebody or something is like","сипаттама","описание","The descriptions from strangers were much more positive."],
"abstract":["ˈæbstrækt","not showing real people or things","абстрактілі","абстрактный","It isn&rsquo;t abstract &mdash; you can see exactly what everything is."],
"background":["ˈbækɡraʊnd","the part of a picture that is furthest away","артқы көрініс","задний план","The woman is in the foreground, but the background is also detailed."],
"foreground":["ˈfɔːɡraʊnd","the part of a picture nearest to you","алдыңғы көрініс","передний план","In the foreground there are four or five tall black trees."],
"blob":["blɒb","a small round mark of colour with no clear shape","дақ","пятно, клякса","Up close it is just blobs of paint; from across the room it is a face."],
"curve":["kɜːv","a line that bends smoothly","иілім","изгиб","The curve of the river takes your eye to the mountains."],
"curtain":["ˈkɜːtn","a piece of cloth hung over a window","перде","занавеска","There might be somebody behind that curtain."],
"teapot":["ˈtiːpɒt","a container for making and pouring tea","шәйнек","чайник","That can&rsquo;t be a bowl &mdash; I think it must be a teapot."],
"sketch":["sketʃ","a quick, simple drawing","эскиз","набросок","It looks like a sketch rather than a finished painting."],
"detailed":["ˈdiːteɪld","containing a lot of small parts and information","егжей-тегжейлі","детальный","I love this painting because it&rsquo;s so detailed."],
"reflect":["rɪˈflekt","to show an image of something, as a mirror does","бейнелеу","отражать","It&rsquo;s reflecting the sea and two old-fashioned sailing ships."],
"reflection":["rɪˈflekʃn","the image you see in a mirror or in water","шағылысу","отражение","The reflection tells you what is behind the painter."],
"express":["ɪkˈspres","to show what you think or feel","білдіру","выражать","Abstract painting expresses an emotion rather than a scene."],
"emotion":["ɪˈməʊʃn","a strong feeling","эмоция","эмоция","The colours carry the emotion, not the shapes."],
"phenomenon":["fəˈnɒmɪnən","something that happens and can be observed","құбылыс","явление","The way a painting looks different from far away is a known phenomenon."],
"seem":["siːm","to give the impression of being something","көріну","казаться","It seems to be a historical scene rather than a modern one."],
"seemingly":["ˈsiːmɪŋli","apparently, as far as anybody can tell","көрінісінше","по-видимому","The seemingly empty room turns out to have a figure in it."],
"consider":["kənˈsɪdə","to think about something carefully","қарастыру","рассматривать","Consider the light before you decide what time of day it is."],
"come across":["ˌkʌm əˈkrɒs","to find something by chance","кездейсоқ табу","наткнуться","I came across this painting in a small gallery in Almaty."],
"historical":["hɪˈstɒrɪkl","connected with events in the past","тарихи","исторический","It must be either an old painting or a painting of a historical scene."],
"honestly":["ˈɒnɪstli","truthfully; used to stress what you are saying","шынымды айтсам","честно говоря","Honestly, I have no idea what is going on in this picture."],
"irritated":["ˈɪrɪteɪtɪd","slightly angry and impatient","ызаланған","раздражённый","He was clearly irritated, but he said it politely."],
"campaign":["kæmˈpeɪn","a planned series of actions to achieve something","науқан","кампания","The campaign asked strangers to describe people they had never met."],
"database":["ˈdeɪtəbeɪs","an organized store of information on a computer","дерекқор","база данных","The whole project is a database that anybody can add to."],
"devote":["dɪˈvəʊt","to give your time or energy to something","арнау","посвящать","She devotes every weekend to bird-watching."],
"hunt":["hʌnt","to chase animals in order to catch them","аң аулау","охотиться","I think they might be going out to hunt."],
"bird-watching":["ˈbɜːd wɒtʃɪŋ","the hobby of watching wild birds","құс бақылау","наблюдение за птицами","Bird-watching looks slow until you try to identify something."],
"closed off":["ˌkləʊzd ˈɒf","blocked so that people cannot get in","жабылған","перекрытый","Half the reserve is closed off between April and July."],
"come up with":["ˌkʌm ʌp ˈwɪð","to think of an idea or a solution","ойлап табу","придумать","Would you like a job where you had to come up with new ideas?"],
"look forward to":["ˌlʊk ˈfɔːwəd tə","to feel pleased about something that is going to happen","асыға күту","с нетерпением ждать","He&rsquo;s the kind of person who always looks forward to the future."],
"look up":["ˌlʊk ˈʌp","to find information in a book or online","іздеп табу","искать (в справочнике)","If you don&rsquo;t know the bird, look it up before you post."],
"make out":["ˌmeɪk ˈaʊt","to manage to see or hear something with difficulty","әрең байқау","разглядеть","I can just make out a figure behind the curtain."],
"put up":["ˌpʊt ˈʌp","to build or place something in position","орнату","установить, повесить","They&rsquo;ve put up a sign, but nobody reads it."],
"side by side":["ˌsaɪd baɪ ˈsaɪd","next to each other","қатар","бок о бок","The two versions hang side by side, and the difference is the point."],
"tap":["tæp","to hit something lightly and quickly","түрту","стучать, касаться","It keeps turning itself off, however hard I tap the screen."],
"crowd-funding":["ˈkraʊd fʌndɪŋ","raising money for a project from many small contributions","краудфандинг","краудфандинг","Crowd-funding sites let an idea be presented directly to the people who might buy it."],
"investor":["ɪnˈvestə","somebody who puts money into a business","инвестор","инвестор","An investor was found, or not found."],
"investment":["ɪnˈvestmənt","money put into a business to make more money","инвестиция","инвестиция","It looked like a poor investment until the pledges started arriving."],
"pledge":["pledʒ","a promise to give a certain amount of money","уәде ету","обещание внести деньги","If enough small pledges are made before the deadline, the money is released."],
"profit":["ˈprɒfɪt","the money you make after costs are paid","пайда","прибыль","The first run barely made a profit, and that was fine."],
"guarantee":["ˌɡærənˈtiː","to promise that something will be done or will happen","кепілдік беру","гарантировать","Nothing is guaranteed until the target is reached."],
"manufacture":["ˌmænjuˈfæktʃə","to make goods in large quantities in a factory","өндіру","производить","Nothing was manufactured until somebody with money agreed that it should be."],
"renovate":["ˈrenəveɪt","to repair an old building and make it good again","жөндеу","реконструировать","The whole district has been renovated in the last ten years."],
"raise":["reɪz","to collect money for a purpose","қаражат жинау","собирать (деньги)","They raised the money in a few weeks."],
"present":["prɪˈzent","to show or offer something formally","ұсыну","представлять","An idea can be presented directly to the people who might buy it."],
"service":["ˈsɜːvɪs","work done for customers rather than goods sold","қызмет","услуга","The site is a service, not a shop."],
"sophisticated":["səˈfɪstɪkeɪtɪd","clever and complicated in design","күрделі","сложный, продвинутый","The prototype is far more sophisticated than the drawing suggests."],
"state-of-the-art":["ˌsteɪt əv ði ˈɑːt","using the most modern methods available","заманауи","новейший","It is made in a state-of-the-art factory outside Madrid."],
"bank loan":["ˈbæŋk ləʊn","money borrowed from a bank","банк несиесі","банковский кредит","A bank loan was applied for, and usually refused."],
"short of cash":["ˌʃɔːt əv ˈkæʃ","not having enough money at the moment","қаражаты тапшы","испытывающий нехватку денег","A company that is short of cash can now test an idea first."],
"set up":["ˌset ˈʌp","to start a business or an organization","құру","основать, создать","My company is opening an office in Seville, and I&rsquo;m involved in setting it up."],
"boutique hotel":["buːˌtiːk həʊˈtel","a small stylish hotel","бутик-қонақүй","бутик-отель","The old bank has been turned into a boutique hotel."],
"must-see":["ˈmʌst siː","something you should not miss","міндетті түрде көру керек","обязательное к посещению","The bridge at night is the one real must-see."],
"magnificent":["mæɡˈnɪfɪsnt","extremely impressive","керемет","великолепный","The view from the castle is magnificent."],
"resemble":["rɪˈzembl","to look like somebody or something","ұқсау","напоминать","It resembles a soft hat more than a pillow."],
"abundance":["əˈbʌndəns","a very large quantity of something","молшылық","изобилие","There is an abundance of good ideas and a shortage of money."],
"back":["bæk","to support a project, usually with money","қолдау көрсету","поддерживать, финансировать","Over $195,000 has been pledged by its backers."],
"compete":["kəmˈpiːt","to try to be better than others at something","жарысу","соревноваться","Winning teams will compete in sixty county competitions."],
"competitive":["kəmˈpetətɪv","involving people trying to be better than others","бәсекелі","конкурентный","Life is competitive, and children should be told so."],
"non-competitive":["ˌnɒn kəmˈpetətɪv","not involving winning or losing","бәсекесіз","несоревновательный","Schools introduced non-competitive activities such as yoga instead."],
"athlete":["ˈæθliːt","somebody who is good at sport, especially track events","спортшы","спортсмен","Not every child is going to become an athlete."],
"event":["ɪˈvent","an organized occasion, or one race in a competition","іс-шара","мероприятие; вид (соревнования)","Schools will play against each other in an Olympics-style event."],
"referee":["ˌrefəˈriː","the official who controls a game","төреші","судья (в игре)","Nobody at that age should be shouting at a referee."],
"riot":["ˈraɪət","violent behaviour by a crowd","тәртіпсіздік","беспорядки","The match ended in something close to a riot."],
"crowd":["kraʊd","a large group of people in one place","көпшілік","толпа","The crowd in the public park could watch every race."],
"cheerleading":["ˈtʃɪəliːdɪŋ","performing dances and chants to support a team","чирлидинг","чирлидинг","Schools introduced activities such as yoga, cheerleading and dancing."],
"dancing":["ˈdɑːnsɪŋ","moving your body in time to music","би","танцы","Yoga, trampolining, dancing &mdash; anything but a race."],
"trampolining":["ˈtræmpəliːnɪŋ","jumping on a trampoline as a sport","батутта секіру","прыжки на батуте","Activities such as trampolining replaced the old sports day."],
"self-esteem":["ˌself ɪˈstiːm","the opinion you have of your own worth","өзін-өзі бағалау","самооценка","Taking part in competitive sport is not bad for people&rsquo;s self-esteem."],
"demotivating":["ˌdiːˈməʊtɪveɪtɪŋ","making you lose interest in trying","ынтасын жоятын","демотивирующий","If everyone knows who will win, it can be boring and demotivating."],
"unrealistic":["ˌʌnrɪəˈlɪstɪk","not sensible, because it cannot happen","шындыққа жанаспайтын","нереалистичный","It&rsquo;s just unrealistic for children to be told that everyone can win."],
"dominate":["ˈdɒmɪneɪt","to be the strongest or most important","үстемдік ету","доминировать","The same three schools dominate the county every year."],
"break a record":["ˌbreɪk ə ˈrekɔːd","to do better than anybody has done before","рекорд жаңарту","побить рекорд","It is hoped the plans will help the country to break more records."],
"home team":["ˌhəʊm ˈtiːm","the team playing at its own ground","үй иесі команда","команда хозяев","The home team wins far more often, and nobody quite knows why."],
"home stadium":["ˌhəʊm ˈsteɪdiəm","the ground where a team normally plays","үй стадионы","домашний стадион","Playing at your home stadium is worth about a goal."],
"field":["fiːld","an area of ground used for playing sport","алаң","поле","The whole school stood round the field and watched."],
"decade":["ˈdekeɪd","a period of ten years","онжылдық","десятилетие","Schools have been avoiding competitive sports for a decade."],
"district":["ˈdɪstrɪkt","an area of a town or country","аудан","район, округ","Every district sends one team to the national final."],
"academically":["ˌækəˈdemɪkli","in terms of study and exams","академиялық тұрғыдан","в учёбе","There are plenty of children who don&rsquo;t do well academically but are brilliant at sport."],
"dramatically":["drəˈmætɪkli","suddenly and by a large amount","күрт","резко, драматически","Participation has fallen dramatically since the change."],
"figure":["ˈfɪɡə","a number, especially in official statistics","көрсеткіш","цифра, показатель","Figures show that more and more children are overweight."],
"thrilling":["ˈθrɪlɪŋ","extremely exciting","тамаша қызық","захватывающий","The last hundred metres were thrilling, whoever you supported."],
"take a decision":["ˌteɪk ə dɪˈsɪʒn","to decide something formally","шешім қабылдау","принять решение","The government has taken a decision to bring the tournaments back."],
"take a risk":["ˌteɪk ə ˈrɪsk","to do something that might go wrong","тәуекелге бару","рисковать","You have to take a risk if you want to win anything."],
"take turns":["ˌteɪk ˈtɜːnz","to do something one after the other","кезектесу","делать по очереди","In a non-competitive class, children simply take turns."],
"take part":["ˌteɪk ˈpɑːt","to be involved in an activity with others","қатысу","участвовать","Competition is healthy, but taking part is more important than winning."],
"take advantage of":["ˌteɪk ədˈvɑːntɪdʒ əv","to make good use of an opportunity","пайдалану","воспользоваться","Not every school takes advantage of the funding available."],
"take care of":["ˌteɪk ˈkeə əv","to look after somebody or something","қамқорлық жасау","заботиться о","Somebody has to take care of the children who come last."],
"take out":["ˌteɪk ˈaʊt","to remove something, or to arrange to get something official","алып тастау; ресімдеу","убрать; оформить","Competitive sport was taken out of the timetable altogether."],
"take someone seriously":["ˌteɪk sʌmwʌn ˈsɪəriəsli","to believe that somebody is worth listening to","байыпты қабылдау","воспринимать всерьёз","Nobody took him seriously until he broke the school record."],
"attraction":["əˈtrækʃn","a place that people visit for pleasure","көрікті жер","достопримечательность","The castle is still the city&rsquo;s main attraction."],
"destination":["ˌdestɪˈneɪʃn","a place people travel to","бағыт","место назначения","It has become a weekend destination rather than a place people fly over."],
"vibrant":["ˈvaɪbrənt","full of energy and life","жанды","оживлённый, яркий","The old port area is now vibrant in a way it never was."],
"run-down":["ˌrʌn ˈdaʊn","in bad condition because nobody has looked after it","қаусаған","обветшалый","Ten years ago the whole district was run-down."],
"trendy":["ˈtrendi","very fashionable at the moment","сәнді","модный","The street is full of trendy cafés and almost no shops."],
"fashionable":["ˈfæʃnəbl","popular and admired at the moment","сәнге айналған","модный, популярный","It became fashionable about five years ago and the rents doubled."],
"open-air":["ˌəʊpən ˈeə","not inside a building","ашық аспан астындағы","под открытым небом","There is an open-air cinema on the roof in summer."],
"nightclub":["ˈnaɪtklʌb","a place open late at night for dancing","түнгі клуб","ночной клуб","Where the factory stood there is now a nightclub."],
"skyline":["ˈskaɪlaɪn","the outline of buildings against the sky","көкжиек сызығы","линия горизонта","Three towers have changed the skyline completely."],
"padded":["ˈpædɪd","filled with soft material","жұмсақ","мягкий, с набивкой","It is a soft padded hat rather than a pillow."],
"pull over":["ˌpʊl ˈəʊvə","to pull something over your head, or to stop a vehicle","басына тарту","натянуть на голову","It&rsquo;s a kind of hat that is pulled over the head in order to take a nap."],
"have a go":["ˌhæv ə ˈɡəʊ","to try something","байқап көру","попробовать","OK, I&rsquo;ll have a go!"],
"have a clue":["ˌhæv ə ˈkluː","to know something &mdash; usually in the negative","түсінігі болу","иметь представление","Honestly, I don&rsquo;t have a clue what it is about."],
"have a feeling":["ˌhæv ə ˈfiːlɪŋ","to think something is probably true","сезім болу","предчувствовать","I have a feeling it will be closed by the time we get there."],
"unheard of":["ʌnˈhɜːd əv","never known to happen before","бұрын-соңды болмаған","неслыханный","Ten years ago an open-air cinema here was unheard of."],
"outlaw":["ˈaʊtlɔː","a criminal who is hiding from the authorities","қашқын қылмыскер","разбойник, изгой","He was an outlaw in Australia in the 1800s."],
"bandit":["ˈbændɪt","an armed robber, especially one attacking travellers","қарақшы","бандит","Colton Harris-Moore was known as the &lsquo;barefoot bandit&rsquo;."],
"criminal":["ˈkrɪmɪnl","somebody who has broken the law","қылмыскер","преступник","There are examples of criminals who actually did some good."],
"burglar":["ˈbɜːɡlə","somebody who breaks into a building to steal","үй тонаушы","взломщик","If he had been an ordinary burglar, nobody would have made a film."],
"robber":["ˈrɒbə","somebody who takes money or property by force","қарақшы","грабитель","The bank robbers were polite to the staff, which is why people liked them."],
"thief":["θiːf","somebody who steals, usually without violence","ұры","вор","A thief takes things quietly; a robber takes them by force."],
"theft":["θeft","the crime of stealing","ұрлық","кража","The theft of five aircraft became a story about a boy who taught himself to fly."],
"rob":["rɒb","to take money or property from a person or place by force","тонау","грабить","The money from the film goes to the people he robbed."],
"arrest":["əˈrest","to take somebody to a police station because of a crime","қамауға алу","арестовать","Ned was arrested for murder, but he claimed he hadn&rsquo;t done it."],
"capture":["ˈkæptʃə","to catch somebody and hold them prisoner","қолға түсіру","поймать, захватить","He was captured in the Bahamas, in a stolen boat."],
"suspect":["ˈsʌspekt","somebody the police think may have committed a crime","күдікті","подозреваемый","For two years he was the main suspect in more than fifty burglaries."],
"victim":["ˈvɪktɪm","somebody who has been hurt or robbed","жәбірленуші","жертва, потерпевший","The money Colton makes from the film will go straight to his victims."],
"prison":["ˈprɪzn","a building where criminals are kept","түрме","тюрьма","When he was arrested, thousands of people protested outside the prison."],
"sentence":["ˈsentəns","the punishment a court gives somebody","үкім","приговор","He was given a seven-year sentence."],
"punishment":["ˈpʌnɪʃmənt","something unpleasant done to somebody because of a crime","жаза","наказание","The argument is about what punishment would actually have helped."],
"fine":["faɪn","money you must pay as a punishment","айыппұл","штраф","For a first offence it is usually a fine rather than prison."],
"illegally":["ɪˈliːɡəli","against the law","заңсыз","незаконно","Every plane he flew had been obtained illegally."],
"stolen":["ˈstəʊlən","taken by somebody who has no right to it","ұрланған","краденый","He was finally arrested, barefoot, in a stolen boat in the Bahamas."],
"crash-land":["ˈkræʃ lænd","to land an aircraft in an emergency, damaging it","апаттық қону","совершить аварийную посадку","He stole five aircraft and crash-landed all of them."],
"barefoot":["ˈbeəfʊt","with nothing on your feet","жалаң аяқ","босиком","He was arrested barefoot, which is where the nickname came from."],
"consequence":["ˈkɒnsɪkwəns","a result of something that has happened","салдар","последствие","That may be true, and it does not change the consequence."],
"violence":["ˈvaɪələns","behaviour intended to hurt people","зорлық-зомбылық","насилие","There was no violence in any of it, which is part of the appeal."],
"nasty":["ˈnɑːsti","unpleasant, or unkind","жағымсыз","мерзкий, неприятный","It was an entertaining story until it turned nasty."],
"upload":["ˌʌpˈləʊd","to move a file from your device onto the internet","жүктеу","загружать","I was uploading a different video and accidentally clicked on this one too."],
"blog":["blɒɡ","a personal website with regular posts","блог","блог","She had been writing the blog for two years before anybody noticed."],
"cyberbullying":["ˈsaɪbəbʊliɪŋ","being cruel to somebody repeatedly online","кибербуллинг","кибербуллинг","What starts as a joke can become cyberbullying very quickly."],
"insult":["ɪnˈsʌlt","to say something rude and offensive to somebody","қорлау","оскорблять","He did not mean to insult anybody; he meant to be funny."],
"careless":["ˈkeələs","not paying enough attention","ұқыпсыз","небрежный, невнимательный","She should have been more careful when she posted the video."],
"upset":["ʌpˈset","unhappy because something bad has happened","ренжіген","расстроенный","Three people were genuinely upset by a post that took nine seconds to write."],
"regret":["rɪˈɡret","to feel sorry about something you have done","өкіну","сожалеть","Posts people regret almost always went out in under a minute."],
"delay":["dɪˈleɪ","a period of waiting before something happens","кідіріс","задержка","A thirty-second delay would prevent most of these mistakes."],
"permission":["pəˈmɪʃn","being allowed to do something","рұқсат","разрешение","He posted a photograph of four colleagues without their permission."],
"interaction":["ˌɪntərˈækʃn","the activity of communicating with somebody","өзара әрекет","взаимодействие","Online interaction loses the face that would have stopped you."],
"inconvenience":["ˌɪnkənˈviːniəns","trouble or difficulty caused to somebody","қолайсыздық","неудобство","Apologies for any inconvenience caused."],
"unintended":["ˌʌnɪnˈtendɪd","not planned or meant","байқаусыз","непреднамеренный","Almost every case here is an unintended consequence."],
"unprofessional":["ˌʌnprəˈfeʃənl","not behaving as somebody should at work","кәсіби емес","непрофессиональный","Now my boss thinks I&rsquo;m really unprofessional."],
"unfashionable":["ˌʌnˈfæʃnəbl","not popular or admired at the moment","сәнден шыққан","немодный","Waiting before you reply has become unfashionable, and that is the problem."],
"reportedly":["rɪˈpɔːtɪdli","according to what people say","хабарларға сәйкес","по сообщениям","He reportedly lost the offer because of a single tweet."],
"sensation":["senˈseɪʃn","something that causes great excitement or interest","сенсация","сенсация","The post became an overnight sensation, which was exactly the problem."],
"submission":["səbˈmɪʃn","something sent in officially, or the act of sending it","тапсыру","подача (заявки)","The submission went in before anybody had read it properly."],
"issue":["ˈɪʃuː","an important subject, or a problem","мәселе","вопрос, проблема","The real issue is not the platform but the speed."],
"change":["tʃeɪndʒ","coins and notes of low value; money returned to you","ұсақ ақша","сдача, мелочь","Have you got any change for the machine?"],
"extension":["ɪkˈstenʃn","extra time allowed, or a phone number inside a company","мерзімді ұзарту","продление; добавочный номер","She asked for an extension and got two more days."],
"light":["laɪt","something used to start a cigarette burning","от","огонёк, прикурить","Have you got a light?"],
"match":["mætʃ","a short stick used for making a flame","сіріңке","спичка","There was one match left in the box."],
"square":["skweə","an open area in a town, with buildings round it","алаң","площадь","They agreed to meet in the main square at seven."],
"speak up":["ˌspiːk ˈʌp","to speak more loudly, or to say what you think","дауысты көтеру; ойын айту","говорить громче; высказаться","Nobody spoke up at the time, and that is what she regrets."],
"candidate":["ˈkændɪdət","somebody being considered for a job or a position","үміткер","кандидат","They should have given him the job anyway, if he was the best candidate."],
"passionate":["ˈpæʃənət","having very strong feelings about something","құштар","страстный, увлечённый","I was passionate about the project, which is not an excuse."],
"stop someone from doing":["ˌstɒp sʌmwʌn frəm ˈduːɪŋ","to prevent somebody from doing something","біреуді істеуден тоқтату","помешать кому-то сделать","Nothing stopped me from checking it first, and I didn&rsquo;t."],
"advertising":["ˈædvətaɪzɪŋ","the business of telling people about products","жарнама","реклама (сфера)","What do you think about advertising to children?"],
"billboard":["ˈbɪlbɔːd","a very large board for advertisements beside a road","билборд","билборд","The same billboard stood at the end of my street for six years."],
"poster":["ˈpəʊstə","a large printed picture or notice put on a wall","плакат","плакат, постер","It was a poster in a bus stop, and I still remember it."],
"brand":["brænd","a product made by a particular company","бренд","бренд, марка","Nobody could name the brand, which is what made it a failure."],
"image":["ˈɪmɪdʒ","a picture, or the impression people have of somebody","бейне","образ, имидж","One image did more for them than three years of billboards."],
"memorable":["ˈmemərəbl","easy to remember, because it is good or unusual","есте қаларлық","запоминающийся","The most memorable adverts are usually the ones that make people laugh."],
"effective":["ɪˈfektɪv","producing the result you want","тиімді","эффективный","I really think the most effective adverts are those that make people laugh."],
"associate":["əˈsəʊʃieɪt","to connect one thing with another in your mind","байланыстыру","ассоциировать","Look at their face and associate it with the name."],
"influence":["ˈɪnfluəns","to affect the way somebody thinks or behaves; the power to do this","ықпал ету; ықпал","влиять; влияние","You need to influence people &mdash; so nothing new there."],
"switch off":["ˌswɪtʃ ˈɒf","to turn off a light or a machine; to stop paying attention","өшіру; зейінін жоғалту","выключить; отключиться","Every moth in Australia was heading for their light because all the others had been switched off."],
"menswear store":["ˈmenzweə stɔː","a shop that sells clothes for men","ер адамдар киімі дүкені","магазин мужской одежды","The whole campaign was for one small menswear store in Melbourne."],
"moth":["mɒθ","an insect like a butterfly that flies at night","көбелек","мотылёк, моль","Suddenly he saw a huge cloud of moths coming towards them."],
"homeless":["ˈhəʊmləs","having nowhere to live","баспанасыз","бездомный","It was an advert to raise awareness of the problems homeless people have."],
"stylish":["ˈstaɪlɪʃ","fashionable and attractive","сәнді","стильный","This model never was stylish. It&rsquo;s just awful!"],
"news agenda":["ˈnjuːz əˌdʒendə","the set of subjects the media are currently covering","жаңалықтар күн тәртібі","новостная повестка","The campaign got homelessness onto the news agenda for a fortnight."],
"persuasive":["pəˈsweɪsɪv","good at making people agree with you","сендіре алатын","убедительный","The most persuasive people in the room are rarely the loudest."],
"persuasion":["pəˈsweɪʒn","the act of making somebody agree with you","көндіру","убеждение (процесс)","Everyone thinks persuasion is about arguments. It is mostly about questions."],
"negotiator":["nɪˈɡəʊʃieɪtə","somebody whose job is to reach agreements","келіссөзші","переговорщик","Skilled negotiators asked more than twice as many questions."],
"objection":["əbˈdʒekʃn","a reason for disagreeing with something","қарсылық","возражение","Overcoming an objection by understanding it is harder than talking over it."],
"objective":["əbˈdʒektɪv","something you are trying to achieve","мақсат","цель","Decide your objective before you decide your argument."],
"overcome":["ˌəʊvəˈkʌm","to deal with a problem successfully","жеңу","преодолеть","Overcoming an objection takes longer than ignoring it."],
"win over":["ˌwɪn ˈəʊvə","to persuade somebody to support you","өз жағына тарту","переубедить, расположить","She won over the room by asking what they were worried about."],
"rely on":["rɪˈlaɪ ɒn","to need somebody or something in order to succeed","сену, арқа сүйеу","полагаться на","We rely on our employees to make the business a success."],
"soft power":["ˌsɒft ˈpaʊə","influence through culture and communication rather than force","жұмсақ күш","мягкая сила","Countries no longer depend on force to increase their influence: this is soft power."],
"psychology":["saɪˈkɒlədʒi","the study of the mind, or the way somebody thinks","психология","психология","The psychology is not complicated, but it is uncomfortable."],
"major":["ˈmeɪdʒə","very large or very important","басты","главный, значительный","The major finding was about questions, not arguments."],
"depend on":["dɪˈpend ɒn","to need somebody or something; to be decided by","байланысты болу","зависеть от","Countries no longer depend on force or politics to increase their influence abroad."],
"aware of":["əˈweə əv","knowing that something exists or is happening","хабардар","осведомлённый о","Most people are not aware of how little they ask."],
"interested in":["ˈɪntrəstɪd ɪn","wanting to know more about something","қызығушылық танытатын","заинтересованный в","We&rsquo;re becoming more interested in how other people see us."],
"capable of":["ˈkeɪpəbl əv","having the ability to do something","қабілетті","способный на","She is perfectly capable of changing her mind &mdash; just not in public."],
"drawback":["ˈdrɔːbæk","a disadvantage of something otherwise good","кемшілік","недостаток","A significant drawback is that children cannot tell an advert from a programme."],
"benefit":["ˈbenɪfɪt","a good effect that something has","пайда","польза, выгода","The obvious benefit is that most free services are paid for this way."],
"advantage":["ədˈvɑːntɪdʒ","something that helps you or makes something better","артықшылық","преимущество","One major advantage is that it pays for things people use free of charge."],
"disadvantage":["ˌdɪsədˈvɑːntɪdʒ","something that makes a situation worse","кемшілік","недостаток","The clearest disadvantage is the pressure it puts on people who cannot afford it."],
"perspective":["pəˈspektɪv","a way of thinking about something","көзқарас","точка зрения, ракурс","From the advertiser&rsquo;s perspective, none of this is a problem."],
};

/* B2 - Intermediate is English only. Instructions and grammar are not
   translated at this level; the RU/KZ pair stays on the vocabulary cards
   and in My Dictionary, behind the translation toggle. */
const TR={};



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
const FINAL_UNIT=UNITS.length;  /* Unit 12 closes the level and doubles as the bridge check */
function isFinalTest(u){ return +u===FINAL_UNIT; }
function testTitle(u){ return isFinalTest(u)?'Final Test':'Unit Test &middot; Unit '+u; }
function testTitleTxt(u){ return isFinalTest(u)?'Final Test':'Unit Test \u00b7 Unit '+u; }

/* Which units the student has collapsed. Everything is open by default, so no
   lesson and no assessment is ever hidden behind a closed accordion on load. */
function closedUnits(){
  try{ return new Set(JSON.parse(localStorage.getItem('jts_int_units_closed')||'[]')); }
  catch(e){ return new Set(); }
}
function saveClosedUnits(set){
  try{ localStorage.setItem('jts_int_units_closed',JSON.stringify([...set])); }catch(e){}
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
      if(isFinalTest(un)){ nFinal++; test=lesRow('data-rev="'+un+'" title="Final Test \u00b7 covers all twelve units and closes the level"','Final Test','asmt fin','final test'); }
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
    a.addEventListener('error',()=>toast('This recording could not be loaded: '+file));
    host.appendChild(a); AUD[id]=a;
  });
}
const A=id=>AUD[id];
function clearAudio(){
  Object.values(AUD).forEach(a=>a&&a.pause());
  stopAt=null; activeEl=null;
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
  const p=btn&&btn.closest&&btn.closest('.player'); if(p&&label)p.classList.add('playing');
  activeEl=el; stopAt=to;
  const start=()=>{
    try{ el.currentTime=from; }catch(e){}
    const pr=el.play(); if(pr&&pr.catch)pr.catch(()=>toast('Could not play the recording.'));
  };
  /* seeking before the track has its duration silently fails, so wait for metadata */
  if(el.readyState>=1) start();
  else { el.addEventListener('loadedmetadata',start,{once:true}); el.load(); }
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
  const p=btn&&btn.closest&&btn.closest('.player'); if(p)p.classList.add('playing');
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

  /* sorting: every word is one item */
  t.querySelectorAll('.sortbox').forEach(box=>{
    if(!visible(box))return;
    box.querySelectorAll('.swd').forEach(wd=>{
      total++; wd.classList.remove('mk-ok','mk-no');
      const f=wd.querySelector('.fix'); if(f)f.remove();
      if(wd.dataset.in===wd.dataset.col){right++;wd.classList.add('mk-ok');}
      else{wd.classList.add('mk-no');
        const s=document.createElement('span');s.className='fix';
        const col=box.querySelector('.sortcol[data-col="'+wd.dataset.col+'"]');
        s.textContent='\u2713 '+(col?col.querySelector('h5').textContent:wd.dataset.col);
        wd.appendChild(s);}
    });
  });
  /* click-to-match: every pair is one item */
  t.querySelectorAll('.pairbox').forEach(box=>{
    if(!visible(box))return;
    box.querySelectorAll('.pit[data-side="l"]').forEach(l=>{
      total++; l.classList.remove('mk-ok','mk-no');
      const f=l.querySelector('.fix'); if(f)f.remove();
      const partner=l.dataset.link?box.querySelector('.pit[data-side="r"][data-link="'+l.dataset.link+'"]'):null;
      const ok=partner&&partner.dataset.key===l.dataset.key;
      if(ok){right++;l.classList.add('mk-ok');if(partner)partner.classList.add('mk-ok');}
      else{l.classList.add('mk-no');if(partner)partner.classList.add('mk-no');
        const want=box.querySelector('.pit[data-side="r"][data-key="'+l.dataset.key+'"]');
        const s=document.createElement('span');s.className='fix';
        s.textContent='\u2713 '+(want?want.dataset.short||want.textContent.trim():l.dataset.key);
        l.appendChild(s);}
    });
  });

  /* G11 - reserve the space the answer line takes, on both columns at once,
     so checking never shifts the exercise under the learner's eyes */
  t.querySelectorAll('.pairbox,.sortbox').forEach(b=>{ if(visible(b))b.classList.add('checked'); });
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
  /* --- sort into columns --- */
  document.querySelectorAll('.sortbox').forEach(box=>{
    /* G11 - the printed order, kept so "Do it again" can restore it */
    [...box.querySelectorAll('.swd')].forEach((w,i)=>{ if(w.dataset.o===undefined)w.dataset.o=String(i); });
    const arm=()=>box.querySelector('.swd.picked');
    box.querySelectorAll('.swd').forEach(wd=>wd.addEventListener('click',()=>{
      if(wd.classList.contains('picked')){wd.classList.remove('picked');return;}
      box.querySelectorAll('.swd').forEach(x=>x.classList.remove('picked'));
      wd.classList.add('picked');
      box.querySelectorAll('.sortcol').forEach(c=>c.classList.add('arm'));
    }));
    box.querySelectorAll('.sortcol').forEach(col=>col.addEventListener('click',()=>{
      const wd=arm(); if(!wd)return;
      wd.classList.remove('picked','mk-ok','mk-no');
      col.querySelector('.drop').appendChild(wd);
      wd.dataset.in=col.dataset.col;
      box.querySelectorAll('.sortcol').forEach(c=>c.classList.remove('arm'));
    }));
    const pool=box.querySelector('.sortpool');
    if(pool)pool.addEventListener('click',e=>{
      if(e.target!==pool)return;
      const wd=arm(); if(!wd)return;
      wd.classList.remove('picked','mk-ok','mk-no'); delete wd.dataset.in; pool.appendChild(wd);
      box.querySelectorAll('.sortcol').forEach(c=>c.classList.remove('arm'));
    });
  });
  /* --- click-to-match pairs --- */
  document.querySelectorAll('.pairbox').forEach(box=>{
    const clear=()=>box.querySelectorAll('.pit').forEach(x=>x.classList.remove('picked'));
    const link=(a,b)=>{
      [a,b].forEach(x=>{
        const old=x.dataset.link;
        if(old)box.querySelectorAll('.pit[data-link="'+old+'"]').forEach(y=>{
          delete y.dataset.link;y.classList.remove('done');const t=y.querySelector('.tag');if(t)t.remove();});
      });
      const n=(+box.dataset.seq||0)+1; box.dataset.seq=n;
      [a,b].forEach(x=>{x.dataset.link=n;x.classList.add('done');
        let t=x.querySelector('.tag');if(!t){t=document.createElement('span');t.className='tag';x.appendChild(t);}
        t.textContent=n;});
    };
    box.querySelectorAll('.pit').forEach(it=>it.addEventListener('click',()=>{
      it.classList.remove('mk-ok','mk-no');
      const other=box.querySelector('.pit.picked');
      if(other===it){it.classList.remove('picked');return;}
      if(other&&other.dataset.side!==it.dataset.side){link(other,it);clear();return;}
      clear(); it.classList.add('picked');
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
const CKEY='jts_int_course_done_v1';
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
  el.querySelectorAll('.errline').forEach(l=>{ delete l.dataset.pick; });
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
  el.querySelectorAll('.slotline').forEach(l=>{ delete l.dataset.pick; });
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
  /* G11 - click-to-match: the links made last time, the numbered tags, the
     answer line and the "already checked" layout state all have to go, or the
     second attempt starts with the first attempt still on the screen. */
  el.querySelectorAll('.pairbox').forEach(box=>{
    box.classList.remove('checked');
    delete box.dataset.seq; delete box.dataset.done;
    box.querySelectorAll('.pit').forEach(p=>{
      p.classList.remove('picked','done','mk-ok','mk-no');
      delete p.dataset.link;
      const f=p.querySelector('.fix'); if(f)f.remove();
      const t=p.querySelector('.tag'); if(t)t.remove();
    });
  });
  /* G11 - sort into columns: the words go back to the pool in the order they
     were printed in, not in the order the last attempt left them. */
  el.querySelectorAll('.sortbox').forEach(box=>{
    box.classList.remove('checked'); delete box.dataset.done;
    const pool=box.querySelector('.sortpool');
    box.querySelectorAll('.sortcol').forEach(c=>c.classList.remove('arm'));
    const words=[...box.querySelectorAll('.swd')].sort((a,b)=>(+a.dataset.o||0)-(+b.dataset.o||0));
    words.forEach(w=>{
      w.classList.remove('picked','mk-ok','mk-no');
      const f=w.querySelector('.fix'); if(f)f.remove();
      delete w.dataset.in;
      if(pool)pool.appendChild(w);
    });
  });
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
  const bk=document.getElementById('lgKZ'); if(bk)bk.classList.toggle('on',lang==='kz');
  const br=document.getElementById('lgRU'); if(br)br.classList.toggle('on',lang==='ru');
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

const DKEY='jts_int_course_dict_v1';
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


/* ---------------------------------------------------------------------
   G1 - the lookup card opens on SELECTION only. A plain click or tap never
   opens it, so a stray touch while reading does nothing. On a phone the
   long-press that selects a word raises the same event, so both input
   methods are covered by the one handler below.
   ------------------------------------------------------------------- */
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
function openDict(){ paintPrefButtons(); document.getElementById('drawer').classList.add('on');
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
/* The lesson text is English only at this level, so there is no KZ/RU switch in
   the header. My Dictionary still holds both translations for all 757 words, so
   the choice lives in the drawer and is remembered with the saved words. */
function prefLang(){ return (store && store.pref==='kz') ? 'kz' : 'ru'; }
function setPref(p){
  store.pref = (p==='kz') ? 'kz' : 'ru';
  save(); paintPrefButtons(); renderList();
}
function paintPrefButtons(){
  const p=prefLang();
  ['ru','kz'].forEach(function(x){
    const b=document.getElementById('dPref'+x.toUpperCase());
    if(b){ b.classList.toggle('on', p===x); b.setAttribute('aria-pressed', p===x?'true':'false'); }
  });
}

const EMPTY=`<div class="dempty">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v18H6.5A2.5 2.5 0 0 1 4 18.5z"/><path d="M8 8h7M8 12h7"/></svg>
  <div>Select any word in the lesson to see its meaning and save it here.</div></div>`;

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
  if(typeof flushWriting==='function')flushWriting();
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
  bindAll(); bindCounters(); bindWriting(); buildPicTask(); buildRail(); paintDone(); go(0); railDone(); paintSidebar();
  if(lang)setLang(lang);
  try{localStorage.setItem('jts_int_course_last',String(n));}catch(e){}
}

/* ---- unit test: one screen, one check, a pass mark and a retake ---- */
function openReview(u){
  if(typeof flushWriting==='function')flushWriting();
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
  mountAudio(); bindAll(); bindCounters(); bindWriting(); buildRubrics(); recBind();
  buildRail(); paintDone(); go(0); railDone(); paintSidebar();
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


/* =====================================================================
   WRITING THAT SURVIVES A RELOAD
   Every free-text box in the workspace is keyed by lesson + task + index
   and written back to localStorage as the learner types. Nothing leaves
   the device.
   ===================================================================== */
const WKEY='jts_int_text_v1';
function wStore(){ try{return JSON.parse(localStorage.getItem(WKEY)||'{}');}catch(e){return {};} }
function wSave(k,v){ const s=wStore(); if(v)s[k]=v; else delete s[k]; try{localStorage.setItem(WKEY,JSON.stringify(s));}catch(e){} }
function wKey(t){
  const host=t.closest('[data-tid]');
  const tid=host?host.dataset.tid:'free';
  const peers=host?[...host.querySelectorAll('textarea')]:[t];
  return 'L'+lessonNo+'::'+tid+'::'+Math.max(0,peers.indexOf(t));
}
/* everything on screen is written out before the workspace is thrown away */
function flushWriting(){
  try{
    ws.querySelectorAll('textarea[data-wkey]').forEach(t=>{ wSave(t.dataset.wkey,t.value); });
    ws.querySelectorAll('.rubric').forEach(box=>{
      const kind=box.dataset.kind, fb=box.querySelector('.rub-fb');
      if(!kind||!fb)return;
      const rec=aGet(kind); rec.fb=fb.value; aSet(kind,rec);
    });
  }catch(e){}
}
function bindWriting(){
  const s=wStore();
  ws.querySelectorAll('textarea').forEach(t=>{
    if(t.dataset.wBound)return; t.dataset.wBound='1';
    const key=wKey(t);
    t.dataset.wkey=key;
    if(s[key]&&!t.value)t.value=s[key];
    let timer=null;
    const note=()=>{
      const box=t.closest('.writebox,.opentask,.rubric');
      const st=box?box.querySelector('.st'):null;
      if(!st)return; st.textContent='Saved'; clearTimeout(st._t);
      st._t=setTimeout(()=>{st.textContent='';},1600);
    };
    const flush=()=>{ clearTimeout(timer); wSave(key,t.value); note(); };
    t.addEventListener('input',()=>{
      clearTimeout(timer);
      timer=setTimeout(flush,400);
    });
    /* leaving the field must not cost the last keystrokes */
    t.addEventListener('blur',flush);
    t.addEventListener('change',flush);
  });
  if(typeof bindCounters==='function')bindCounters();
}

/* =====================================================================
   ASSESSMENT - Unit Test Parts 7 and 8
   Writing and speaking are not marked automatically and they are not
   marked by the learner. The learner submits; the teacher or the AI
   tutor scores six criteria from 0 to 3 and writes the feedback. The
   two criteria sets are different, because writing and speaking are.
   AI marking: an integration can set window.JTS_AI_ASSESS to a function
   that receives the brief below and returns {bands:[...],feedback:''};
   with no integration present the brief is copied to the clipboard so it
   can be pasted into the tutor, and the teacher can score by hand.
   ===================================================================== */
const RUB_BANDS=['0 &middot; not attempted','1 &middot; below B1','2 &middot; at B1','3 &middot; above B1'];
const RUBRIC={
  write:{
    label:'Part 7 &middot; Writing',
    crit:[
      ['Task completion','Everything the task asked for is there, including the points listed above.'],
      ['Ideas and relevance','The content answers the question, with a reason or an example behind each claim.'],
      ['Organisation and coherence','The order is clear and the linking carries the reader from one idea to the next.'],
      ['Grammar: range and accuracy','The forms taught in this unit are used, and the mistakes do not block the meaning.'],
      ['Vocabulary: range and appropriacy','Unit vocabulary is used correctly, and the register fits the reader.'],
      ['Mechanics and length','Spelling, punctuation, and the length the task asked for.']
    ]},
  speak:{
    label:'Part 8 &middot; Speaking',
    crit:[
      ['Task completion','Both parts of the prompt are covered, for the length of turn the task asked for.'],
      ['Fluency','The turn keeps moving; the pauses are for thinking, not for translating.'],
      ['Pronunciation and intelligibility','A listener follows it throughout; word stress does not send the meaning elsewhere.'],
      ['Grammar: range and accuracy','The forms taught in this unit appear, and are right more often than not.'],
      ['Vocabulary range','Unit vocabulary and the useful phrases are used rather than avoided.'],
      ['Coherence and interaction','Ideas are ordered and linked, and the question asked is the question answered.']
    ]}
};
const AKEY='jts_int_assess_v1';
function aStore(){ try{return JSON.parse(localStorage.getItem(AKEY)||'{}');}catch(e){return {};} }
function aGet(kind){ const s=aStore(); return s[lessonNo+'::'+kind]||{who:'teacher',bands:[],fb:'',sent:0}; }
function aSet(kind,rec){ const s=aStore(); s[lessonNo+'::'+kind]=rec; try{localStorage.setItem(AKEY,JSON.stringify(s));}catch(e){} }

function rubVerdict(bands){
  if(bands.length<6||bands.some(b=>b===undefined||b===null))return ['','Not scored yet',''];
  const t=bands.reduce((a,b)=>a+b,0);
  if(t>=15)return [t,'Above B1','pass'];
  if(t>=12)return [t,'At B1 \u2014 pass','pass'];
  if(t>=9) return [t,'Approaching B1','near'];
  return [t,'Below B1','low'];
}

function buildRubrics(){
  const slot=ws.querySelector('.rubric-slot'); if(!slot)return;
  const reqs=slot.querySelector('.reqlist');
  const reqHtml=reqs?reqs.innerHTML:'';
  slot.innerHTML=
    '<div class="reqcard"><b>What this task asked for &mdash; the assessor marks against this</b><ul>'+reqHtml+'</ul></div>'+
    rubricCard('write')+rubricCard('speak');
  ['write','speak'].forEach(k=>wireRubric(slot.querySelector('.rubric[data-kind="'+k+'"]'),k));
  ['test-write','test-speak'].forEach(tid=>{
    const task=ws.querySelector('[data-tid="'+tid+'"]'); if(!task)return;
    if(task.querySelector('.subbar'))return;
    const kind=tid==='test-write'?'write':'speak';
    const bar=document.createElement('div'); bar.className='subbar';
    bar.innerHTML='<button class="btn btn-primary" type="button">'+
      (kind==='write'?'Submit for assessment':'Submit the recording for assessment')+
      '</button><span class="sub-st"></span>';
    bar.querySelector('button').onclick=()=>submitForAssessment(kind);
    task.appendChild(bar);
    paintSubmitted(kind);
  });
}
function rubricCard(kind){
  const R=RUBRIC[kind];
  return '<div class="rubric" data-kind="'+kind+'">'+
    '<div class="rub-head"><div class="rub-t"><b>'+R.label+'</b>'+
      '<span>Scored by the teacher or the AI tutor against the criteria below, not by the learner.</span></div>'+
    '<div class="rub-who"><span>Assessed by</span>'+
      '<button class="rw" type="button" data-w="teacher">Teacher</button>'+
      '<button class="rw" type="button" data-w="ai">AI tutor</button></div></div>'+
    '<div class="rub-sub">Learner response: <b class="rub-sent">not submitted yet</b> <span class="st"></span></div>'+
    R.crit.map((c,i)=>'<div class="rub-crit" data-c="'+i+'"><div class="rub-cn"><b>'+c[0]+'</b><span>'+c[1]+'</span></div>'+
      '<div class="rub-bands">'+[0,1,2,3].map(b=>'<button class="rbd" type="button" data-b="'+b+'">'+b+'</button>').join('')+
      '</div></div>').join('')+
    '<div class="rub-key">'+RUB_BANDS.join(' &nbsp;&middot;&nbsp; ')+'</div>'+
    '<textarea class="rub-fb" rows="3" placeholder="Feedback for the learner: one thing that worked, one thing to change."></textarea>'+
    '<div class="rub-foot"><div class="rub-score"><b>&mdash;</b> / 18 <span class="rub-verdict">Not scored yet</span></div>'+
      '<button class="btn btn-ghost rub-brief" type="button">Copy marking brief</button>'+
      '<button class="btn btn-ghost rub-clear" type="button">Clear</button></div>'+
  '</div>';
}
function wireRubric(box,kind){
  if(!box)return;
  const rec=aGet(kind);
  const paint=()=>{
    box.querySelectorAll('.rw').forEach(b=>b.classList.toggle('on',b.dataset.w===rec.who));
    box.querySelectorAll('.rub-crit').forEach(c=>{
      const v=rec.bands[+c.dataset.c];
      c.querySelectorAll('.rbd').forEach(b=>b.classList.toggle('on',String(v)===b.dataset.b));
    });
    const [t,label,cls]=rubVerdict(rec.bands);
    box.querySelector('.rub-score b').innerHTML=(t===''?'&mdash;':t);
    const v=box.querySelector('.rub-verdict');
    v.textContent=label; v.className='rub-verdict '+(cls||'');
  };
  box.querySelectorAll('.rw').forEach(b=>b.onclick=()=>{ rec.who=b.dataset.w; aSet(kind,rec); paint(); });
  box.querySelectorAll('.rub-crit').forEach(c=>{
    c.querySelectorAll('.rbd').forEach(b=>b.onclick=()=>{
      rec.bands[+c.dataset.c]=+b.dataset.b; aSet(kind,rec); paint();
    });
  });
  const fb=box.querySelector('.rub-fb');
  fb.value=rec.fb||'';
  let tm=null;
  const fbFlush=()=>{ clearTimeout(tm); rec.fb=fb.value; aSet(kind,rec); };
  fb.addEventListener('input',()=>{ clearTimeout(tm); tm=setTimeout(fbFlush,400); });
  fb.addEventListener('blur',fbFlush);
  fb.addEventListener('change',fbFlush);
  box.querySelector('.rub-clear').onclick=()=>{
    rec.bands=[]; rec.fb=''; fb.value=''; aSet(kind,rec); paint();
  };
  box.querySelector('.rub-brief').onclick=()=>copyBrief(kind);
  paint(); paintSubmitted(kind);
}
function assessTaskText(kind){
  const task=ws.querySelector('[data-tid="test-'+(kind==='write'?'write':'speak')+'"]');
  if(!task)return '';
  const p=task.querySelector('.ohint,.sp-task');
  return p?p.textContent.trim():'';
}
function learnerText(kind){
  if(kind!=='write')return '';
  const t=ws.querySelector('[data-tid="test-write"] textarea');
  return t?t.value.trim():'';
}
function submitForAssessment(kind){
  const rec=aGet(kind);
  if(kind==='write'){
    const txt=learnerText('write');
    if(!txt){ toast('Write your answer first, then submit it.'); return; }
    rec.text=txt;
  }
  rec.sent=Date.now(); aSet(kind,rec);
  paintSubmitted(kind);
  toast(kind==='write'
    ? 'Submitted. Your teacher or the AI tutor marks it against the criteria below.'
    : 'Marked as delivered. Your teacher or the AI tutor scores it against the criteria below.');
}
function paintSubmitted(kind){
  const rec=aGet(kind);
  const when=rec.sent?new Date(rec.sent).toLocaleString():'';
  const box=ws.querySelector('.rubric[data-kind="'+kind+'"]');
  if(box){ const b=box.querySelector('.rub-sent');
    if(b)b.textContent=rec.sent?('submitted '+when):'not submitted yet'; }
  const task=ws.querySelector('[data-tid="test-'+kind.replace('write','write').replace('speak','speak')+'"]');
  const st=task?task.querySelector('.sub-st'):null;
  if(st){ st.textContent=rec.sent?('Submitted '+when):''; st.classList.toggle('on',!!rec.sent); }
}
function assessBrief(kind){
  const R=RUBRIC[kind], rec=aGet(kind);
  const strip=s=>s.replace(/&middot;/g,'-').replace(/&mdash;/g,'-');
  const reqs=[...ws.querySelectorAll('.reqcard li')].map(li=>' - '+li.textContent.trim()).join('\n');
  const lines=[
    'JTS Intermediate (B1+) - '+(CUR&&CUR.title?CUR.title:'Unit Test'),
    strip(R.label)+' - marking brief',
    '',
    'TASK', assessTaskText(kind)||'(see the test)',
    '',
    'WHAT THE TASK ASKED FOR', reqs,
    '',
    'CRITERIA - score each 0-3 (0 not attempted, 1 below B1, 2 at B1, 3 above B1)',
    R.crit.map((c,i)=>(i+1)+'. '+c[0]+' - '+c[1]).join('\n'),
    '',
    'PASS: 12 or more out of 18 is at B1.',
    ''
  ];
  if(kind==='write'){
    lines.push('LEARNER RESPONSE', (rec.text||learnerText('write')||'(not submitted)'));
  } else {
    lines.push('LEARNER RESPONSE', 'Spoken - listen to the recording in the test, or to the learner live.');
  }
  lines.push('', 'Return a band for each criterion and two lines of feedback: one thing that worked, one thing to change.');
  return lines.join('\n');
}
function copyBrief(kind){
  const text=assessBrief(kind);
  if(typeof window.JTS_AI_ASSESS==='function'){
    Promise.resolve(window.JTS_AI_ASSESS(text,kind)).then(r=>{
      if(!r)return;
      const rec=aGet(kind);
      if(Array.isArray(r.bands))rec.bands=r.bands.slice(0,6).map(Number);
      if(r.feedback)rec.fb=r.feedback;
      rec.who='ai'; aSet(kind,rec);
      const box=ws.querySelector('.rubric[data-kind="'+kind+'"]');
      if(box)wireRubric(box,kind);
      toast('The AI tutor has marked this part.');
    }).catch(()=>toast('The AI tutor could not be reached.'));
    return;
  }
  const done=()=>toast('Marking brief copied. Paste it to the AI tutor, or send it to your teacher.');
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done,()=>fallbackCopy(text,done));
  } else fallbackCopy(text,done);
}
function fallbackCopy(text,done){
  const a=document.createElement('textarea');
  a.value=text; a.style.position='fixed'; a.style.opacity='0';
  document.body.appendChild(a); a.select();
  try{document.execCommand('copy');done();}catch(e){toast('Copy is blocked here - select the text by hand.');}
  a.remove();
}
/* Инлайновые обработчики разметки курса ищут эти функции в window. */
Object.assign(window,{JCROOT,toast,testKey,saveTestScore,getTestScore,clearTestScore,lesRow,isFinalTest,testTitle,testTitleTxt,closedUnits,saveClosedUnits,toggleAllUnits,paintExpandBtn,buildSidebar,openMenu,closeMenu,toggleMenu,paintUnitProgress,seqIndex,seqOpen,seqLabel,seqDone,stepLesson,paintSeqNav,paintNextStep,revealActive,paintTestChip,paintSidebar,trackSrc,mountAudio,clearAudio,restore,arm,playRange,playN,playSeg,playAll,playFull,playPart,playEx,playCue,playS15,playS18,play62,play63,playPeople,play64,play65,play617,playChunk,play613,play615,play616,playNews,playObj,play52,play53,playDecl,play58,playShop,play56,play57,play59,playU,playFood,playCan,playWaste,playComp,playPhrase,playWord103,playSlide,playClip,buildSegList,togglePattern,visible,extendsAnswer,captureCues,check,updateScore,buildSlider,renderSlide,slide,fcFaces,flipTile,cardAdd,syncAddButtons,buildVocab,fill,bindAll,buildPicTask,pickWord,dropWord,buildSummary,saveDone,bag,markDone,clearDone,resetTask,againTask,allDone,paintDone,railDone,langAllowed,paintLangButtons,setLang,REC_T,recSupported,recNote,recFmt,recTick,recStopPlayback,recRender,recPlay,recDel,recCleanup,recBind,save,has,count,addWord,removeWord,lookupWord,hidePop,popAdd,sayWord,selectedWord,lookupFromSelection,openDict,closeDict,dTab,prefLang,setPref,paintPrefButtons,renderList,migrate,schedule,isDue,isHard,byPriority,reLang,tlOf,renderTest,shuffle,distract,makeQ,pStart,pRender,pFeedback,pPick,pTyped,pResults,bindCounters,buildRail,go,renderNotes,openLesson,openReview,checkReview,resetReview,resetLesson,setMode,wStore,wSave,wKey,flushWriting,bindWriting,aStore,aGet,aSet,rubVerdict,buildRubrics,rubricCard,wireRubric,assessTaskText,learnerText,submitForAssessment,paintSubmitted,assessBrief,copyBrief,fallbackCopy});
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