// Shared announcement appearance, matching the staff editor preview.
/** Имя, иконка, цвет, фон кнопки, подпись шаблона. */
export const NEWS_TYPES = {
    important: ['Важно', 'priority_high', '#E5484D', '#FDECEC', 'Правила, регламент, договор. Кнопка «Ознакомлен(а)»'],
    update: ['Обновление платформы', 'rocket_launch', '#7432E0', '#F2EBFF', 'Новый раздел или функция, скриншот'],
    event: ['Событие', 'event', '#2D6CDF', '#E8F0FD', 'Вебинар, собрание, обучение: дата и время'],
    promo: ['Акция / конкурс', 'campaign', '#E8730C', '#FFF0E0', 'Конкурсы, премии, бонусы — «реклама» для учителей'],
    congrats: ['Поздравление', 'celebration', '#C99400', '#FFF7D6', 'Праздники, итоги месяца, благодарности'],
    poll: ['Опрос', 'ballot', '#1F9D55', '#E6F6EC', 'Вопрос с вариантами ответа прямо в окне'],
    material: ['Новый материал', 'auto_stories', '#0F9C9C', '#E0F6F5', 'Новый курс, юнит, раздел практики'],
    deadline: ['Напоминание о сроке', 'alarm', '#D6336C', '#FDE8EF', 'Отчёты, отметка уроков, выплаты — обратный отсчёт'],
    vacancy: ['Вакансия', 'work', '#4F46E5', '#EAE9FF', 'Внутренний набор, «Откликнуться»'],
    hero: ['Герой месяца', 'military_tech', '#B7791F', '#FFF4DC', 'История преподавателя месяца с фото']
};
export const NEWS_AUDIENCE = ['Все преподаватели', 'General', 'Premium', 'Kids', 'IELTS', 'SAT', 'Новички'];
export const NEWS_MASCOTS = [
    ['cheer', 'Маскот'], ['run', 'С ноутбуком'], ['read', 'С книгой UK'], ['fly', 'Полёт с книгой'], ['team', 'Команда'],
    ['call', 'Видеозвонок'], ['angry', 'Внимание!'], ['sleep', 'Не спи!'], ['wallet', 'Кошелёк'], ['none', 'Без маскота']
];
export const TYPE_MASCOT = {
    important: 'angry', update: 'run', event: 'call', promo: 'cheer', congrats: 'team',
    poll: 'cheer', material: 'read', deadline: 'sleep', vacancy: 'fly', hero: 'cheer'
};
export const TYPE_THEME = { promo: 'party', hero: 'party' };
export const NEWS_THEMES = [
    { key: 'clouds', name: 'Облака AI Tutor', dark: false, bg: "#EEE8FF url('/assets/whats-new/bg.webp') center bottom / cover no-repeat" },
    { key: 'lavender', name: 'Лаванда', dark: false, bg: 'linear-gradient(135deg,#F5F0FF,#DCCBFF)' },
    { key: 'sky', name: 'Небо', dark: false, bg: 'linear-gradient(135deg,#EEF6FF,#BFDCFF)' },
    { key: 'mint', name: 'Мята', dark: false, bg: 'linear-gradient(135deg,#ECFCF5,#B5EED7)' },
    { key: 'sun', name: 'Солнце', dark: false, bg: 'linear-gradient(135deg,#FFF9E2,#FFDB7A)' },
    { key: 'peach', name: 'Персик', dark: false, bg: 'linear-gradient(135deg,#FFF1E8,#FFC4A6)' },
    { key: 'rose', name: 'Роза', dark: false, bg: 'linear-gradient(135deg,#FFF0F6,#FFBBD6)' },
    { key: 'white', name: 'Белый', dark: false, bg: '#fff' },
    { key: 'violet', name: 'Фиолет', dark: true, bg: 'linear-gradient(120deg,#6A2BD9,#B04BFF)' },
    { key: 'party', name: 'Праздник', dark: true, bg: 'radial-gradient(circle at 12% 20%,#FFD54F 0 4px,transparent 5px),radial-gradient(circle at 80% 15%,#FF7AB6 0 5px,transparent 6px),radial-gradient(circle at 65% 85%,#7CE0C3 0 4px,transparent 5px),radial-gradient(circle at 92% 60%,#FFD54F 0 3px,transparent 4px),linear-gradient(120deg,#6B2BD9,#C04BFF 55%,#FFB347)' },
    { key: 'ocean', name: 'Океан', dark: true, bg: 'linear-gradient(120deg,#1F5FD6,#1FC2C2)' },
    { key: 'forest', name: 'Лес', dark: true, bg: 'linear-gradient(120deg,#0E8A66,#5CC98A)' },
    { key: 'coral', name: 'Коралл', dark: true, bg: 'linear-gradient(120deg,#F0485B,#FFA45C)' },
    { key: 'berry', name: 'Ягода', dark: true, bg: 'linear-gradient(120deg,#B0186E,#F04D9A)' },
    { key: 'night', name: 'Ночь', dark: true, bg: 'linear-gradient(120deg,#17113F,#3B2A8C)' },
    { key: 'type', name: 'Цвет шаблона', dark: true, bg: '' }
];
/** Фон окна при входе: светлый свой цвет светлеет к белому, тёмный — уходит в тень. */
export function newsSurface(post) {
    if (post.theme === 'custom' && post.color && /^#[\da-f]{6}$/i.test(post.color)) {
        const light = hexLum(post.color) > 0.62;
        const bg = light
            ? `linear-gradient(135deg, ${hexShade(post.color, 0.55)}, ${post.color})`
            : `linear-gradient(120deg, ${post.color}, ${hexShade(post.color, -0.35)})`;
        return { bg, dark: !light };
    }
    const theme = NEWS_THEMES.find(item => item.key === (post.theme || 'clouds')) || NEWS_THEMES[0];
    if (theme.key === 'type') {
        return { bg: `linear-gradient(115deg, ${NEWS_TYPES[post.type]?.[2] || '#7432E0'} 10%, #2A1A66 120%)`, dark: true };
    }
    return { bg: theme.bg, dark: theme.dark };
}
function hexLum(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function hexShade(hex, amount) {
    const n = parseInt(hex.replace('#', ''), 16);
    const mix = (channel) => Math.max(0, Math.min(255, Math.round(amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount)));
    return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(mix).map(channel => channel.toString(16).padStart(2, '0')).join('');
}
