// 실낱 같은 희망(c007) — 스크롤하면 붉은 실 한 줄이 끊기지 않고 이어지는 단독 페이지.
// 센서 없음. 원작 Take 1·2(작가 허락, 선을 벡터로 옮김)는 숨 쉬고 고개를 든다.
import { sceneSVG, SCENES, redThread, curve, loop } from './silnat-art.js?v=3';
import { lang, langSwitcher } from './i18n.js?v=7';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const IN_FRAME = window !== window.top;
const $ = (s, el = document) => el.querySelector(s);

// ───────── 글(가상의 인물 · 전시 문안) — 한·영·중·일 ─────────
const IDS = [['cart', 71], ['boxes', 24], ['scarf', 58], ['phone', 31], ['door', 22]];
const TEXT = {
  ko: {
    title: '실낱 같은 희망', by: '김바늘 · 혼합매체 · 섬유미술', hint: '천천히 내려 보세요',
    caps: ['흰 종이 위, 방 한구석.<br>한 사람이 무릎을 안고 앉아 있습니다.', '그러다, 고개를 듭니다.', '저기, 붉은 실 한 가닥.'],
    heroAlt: '김바늘, 실낱 같은 희망 Take 1·2. 방 한구석에 웅크린 사람이 고개를 들어 붉은 실을 본다.',
    nums: ['하나', '둘', '셋', '넷', '다섯'], fiction: '가상의 인물 · 전시 문안',
    people: [
      ['새벽 네 시의 리어카', '정옥', ['새벽 네 시, 정옥 씨의 하루는 리어카 바퀴 소리로 시작됩니다.', '골목마다 내놓인 상자를 접어 싣고, 고물상 저울에 올립니다. 그날 번 돈은 두 딸의 밥값이 됩니다.', '정옥 씨는 오늘도 저녁을 건너뜁니다. 리어카 손잡이에는 작은딸이 두고 간 머리끈이 묶여 있습니다.']],
      ['밤 열한 시의 편의점', '민재', ['민재 씨는 밤새 편의점을 지킵니다.', '새벽이 가까워지면 빈 상자를 하나씩 접어 문 옆에 쌓아 둡니다. 누가 가져가는지는 정확히 모릅니다.', '다만 아침이면 상자가 없어져 있고, 가끔 문 앞에 사탕 한 알이 놓여 있습니다.']],
      ['첫차', '영호', ['영호 씨는 첫차를 몹니다. 정류장마다 같은 얼굴들이 같은 자리에 앉습니다.', '일을 마치면 요양병원에 들러, 이제 영호 씨를 잘 알아보지 못하는 아내 곁에 앉습니다.', '그리고 목도리를 뜹니다. 하루에 한 줄씩. 겨울이 오기 전에 끝내려고요.']],
      ['오후의 영상통화', '란', ['란 씨는 영호 씨 버스의 단골입니다. 맨 뒷자리 창가에서 늘 졸다가 내립니다.', '공장 쉬는 시간, 란 씨는 휴대폰 화면 속 딸과 이야기합니다.', '손목의 실 팔찌는 떠나오던 날 딸이 묶어 주었습니다. “엄마, 이거 풀리면 오는 거야.” 팔찌는 아직 단단합니다.']],
      ['문고리의 봉지', '서윤', ['서윤 씨는 며칠째 방 밖으로 나가지 못했습니다. 이유를 설명하기도 어렵습니다.', '저녁마다 문고리가 조금 흔들리고, 발소리가 멀어집니다. 문을 열면 반찬 봉지가 걸려 있습니다.', '붉은 끈으로 단단히 묶은 매듭. 옆집 할머니의 매듭입니다.']],
    ],
    bg: [],
    retNo: '다시, 그 방', ret: ['실은 문틈으로 들어가, 방 한구석에 닿습니다.', '실낱 같은 희망은 크지 않습니다.<br>다만 끊기지 않을 뿐입니다.'],
    retAlt: '다시 그 방. 붉은 실이 웅크린 사람의 발치에 닿는다.', knot: '실 끝에 매듭 짓기', knotDone: '매듭을 지었어요',
    blankH: '아직 수놓이지 않은 장', blank: '《실낱 같은 희망》은 다섯 점으로 이어지는 연작입니다. 나머지 세 점은 작가가 지금 수놓고 있습니다.', blankAlt: '아직 수놓이지 않음',
    p2No: 'PART 2 · 작품과 작가', p2H: '김바늘 《실낱 같은 희망》',
    p2: ['흰 종이 위에 바늘과 실로 선을 수놓습니다. 다섯 점으로 이어지는 연작 가운데 첫 두 점입니다. 구상과 시놉시스부터 한 땀 한 땀의 실, 마지막 액자 작업까지 작가가 직접 했습니다.', '[작가 노트 — 작가에게 받을 예정]'],
    dl: [['작가', '김바늘 · 혼합매체, 섬유미술'], ['재료', '종이에 실 [확인 필요]'], ['연작', 'Take 1 · Take 2 (5점 중 2점)']],
    credit: '© 김바늘. 작품 이미지는 작가의 허락을 받아 사용했고, 화면의 선은 원작 사진을 옮긴 것입니다. 다섯 사람의 장면 그림은 작가의 허락을 받은 전시용 일러스트이고, 다섯 사람은 가상의 인물입니다(전시 문안).',
    end: '오늘, 당신의 실은<br>어디에 묶여 있나요.', exit: '전시 행성 나가기',
    help: '마음이 힘들 때는 자살예방 상담전화 <b>109</b>(24시간),<br>카카오톡·문자 상담 ‘마들랜’에서 이야기를 들어 줍니다.',
    sndOn: '소리 켜기', sndOff: '소리 끄기',
  },
  en: {
    title: 'A Thread of Hope', by: 'Kim Baneul · Mixed media · Textile art', hint: 'Scroll down slowly',
    caps: ['On white paper, a corner of a room.<br>Someone sits hugging their knees.', 'And then, they lift their head.', 'Over there — a single red thread.'],
    heroAlt: 'Kim Baneul, A Thread of Hope, Take 1 and 2. A person curled up in the corner of a room lifts their head and sees a red thread.',
    nums: ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'], fiction: 'Fictional characters · exhibition text',
    people: [
      ['The cart at 4 a.m.', 'Jeong-ok', ['At four in the morning, Jeong-ok’s day begins with the sound of cart wheels.', 'She folds the boxes left out in each alley, loads them up and sets them on the scrap dealer’s scale. What she earns that day pays for her two daughters’ meals.', 'Today again, Jeong-ok skips dinner. Tied to the cart handle is a hair tie her younger daughter left behind.']],
      ['The convenience store at 11 p.m.', 'Minjae', ['Minjae keeps the convenience store open through the night.', 'As dawn nears, he folds the empty boxes one by one and stacks them by the door. He isn’t sure who takes them.', 'But by morning the boxes are gone, and now and then a single candy is left by the door.']],
      ['The first bus', 'Youngho', ['Youngho drives the first bus of the day. At every stop, the same faces take the same seats.', 'After work he stops by the care home and sits beside his wife, who no longer quite recognizes him.', 'And he knits a scarf. One row a day. He wants to finish before winter comes.']],
      ['A video call in the afternoon', 'Lan', ['Lan is a regular on Youngho’s bus. She always dozes by the back window until her stop.', 'On her factory break, Lan talks with her daughter on her phone screen.', 'The thread bracelet on her wrist was tied by her daughter the day she left. “Mom, when this comes undone, you come home.” The bracelet is still tight.']],
      ['The bag on the doorknob', 'Seoyun', ['Seoyun hasn’t been able to leave her room for days. It is hard to explain why.', 'Every evening the doorknob shakes a little, and footsteps fade away. When she opens the door, a bag of side dishes is hanging there.', 'A knot tied tight with red string. The knot of the old woman next door.']],
    ],
    bg: ['In Korea, many older people make a living by collecting cardboard and waste paper from the streets.', 'Convenience stores in Korea stay open all night, and many young people work the night shift.', 'The first bus leaves before dawn, carrying people to early-morning jobs.', 'Many migrant workers in Korea’s factories live far away from their children.', 'Banchan are the small side dishes served at every Korean meal; neighbours often share them.'],
    retNo: 'Back in that room', ret: ['The thread slips through the gap under the door and reaches the corner of the room.', 'A thread of hope is not large.<br>It simply does not break.'],
    retAlt: 'Back in the room. The red thread reaches the feet of the curled-up person.', knot: 'Tie a knot at the end', knotDone: 'Knot tied',
    blankH: 'Pages not yet stitched', blank: 'A Thread of Hope is a series of five works. The artist is stitching the remaining three right now.', blankAlt: 'not yet stitched',
    p2No: 'PART 2 · The work and the artist', p2H: 'Kim Baneul, A Thread of Hope',
    p2: ['Lines are stitched onto white paper with needle and thread. These are the first two works of a series of five. From the idea and synopsis to every stitch and the final framing, the artist made each part by hand.', '[Artist’s note — to come]'],
    dl: [['Artist', 'Kim Baneul · Mixed media, textile art'], ['Material', 'Thread on paper [to be confirmed]'], ['Series', 'Take 1 · Take 2 (2 of 5)']],
    credit: '© Kim Baneul. The artwork images are used with the artist’s permission; the lines on screen were traced from photographs of the originals. The scene drawings of the five people are exhibition illustrations made with the artist’s permission, and the five people are fictional (exhibition text).',
    end: 'Today, where is<br>your thread tied?', exit: 'Leave this planet',
    help: 'If you are struggling, please reach out to a crisis line or counselling service near you.',
    sndOn: 'Sound on', sndOff: 'Sound off',
  },
  zh: {
    title: '一线希望', by: 'Kim Baneul · 综合材料 · 纤维艺术', hint: '请慢慢向下滑动',
    caps: ['白纸上，房间的一角。<br>一个人抱着膝盖坐着。', '然后，抬起了头。', '那边，有一根红线。'],
    heroAlt: 'Kim Baneul《一线希望》Take 1、2。蜷缩在房间角落的人抬起头，看见一根红线。',
    nums: ['一', '二', '三', '四', '五'], fiction: '虚构人物 · 展览文案',
    people: [
      ['凌晨四点的手推车', '正玉', ['凌晨四点，正玉的一天从手推车轮子的声音开始。', '她把每条巷子里放在外面的纸箱折好装上车，再放到废品站的秤上。那天挣的钱，是两个女儿的饭钱。', '今天，正玉又没吃晚饭。手推车把手上系着小女儿留下的发圈。']],
      ['晚上十一点的便利店', '敏在', ['敏在整夜守着便利店。', '天快亮时，他把空纸箱一个个折好，堆在门边。他并不清楚是谁拿走的。', '只是到了早上，纸箱总会不见，门口偶尔还放着一颗糖。']],
      ['头班车', '永浩', ['永浩开头班车。每一站，都是同样的面孔坐在同样的位置。', '下班后，他会去疗养院，坐在已经不太认得他的妻子身边。', '然后织围巾。一天织一行。他想在冬天到来之前织完。']],
      ['下午的视频通话', '兰', ['兰是永浩那趟车的常客，总在最后一排靠窗打瞌睡，到站才下车。', '工厂休息时，兰和手机屏幕里的女儿说话。', '手腕上的线手链，是她离开那天女儿系上的。“妈妈，这个松开了，你就回来。”手链还系得很紧。']],
      ['门把手上的袋子', '瑞允', ['瑞允已经好几天没能走出房间了。原因也很难说清。', '每到傍晚，门把手会轻轻晃一下，脚步声渐渐走远。打开门，门把手上挂着一袋小菜。', '用红绳系得紧紧的结。是隔壁奶奶的结。']],
    ],
    bg: ['在韩国，不少老人靠在街头捡纸箱、废纸维持生计。', '韩国的便利店通宵营业，很多年轻人在那里上夜班。', '头班公交车在天亮前出发，载着去上早班的人。', '韩国工厂里的许多外籍劳工，都和孩子远隔两地。', '小菜（반찬）是韩国人每顿饭都有的配菜，邻居之间常常互相分享。'],
    retNo: '又回到那个房间', ret: ['线从门缝钻进去，抵达房间的一角。', '一线希望并不大。<br>只是不会断。'],
    retAlt: '又回到那个房间。红线来到蜷缩着的人脚边。', knot: '在线的末端打个结', knotDone: '结打好了',
    blankH: '尚未绣出的篇章', blank: '《一线希望》是由五件作品组成的系列。其余三件，艺术家正在绣制。', blankAlt: '尚未绣出',
    p2No: 'PART 2 · 作品与艺术家', p2H: 'Kim Baneul《一线希望》',
    p2: ['用针和线在白纸上绣出线条。这是五件系列作品中的前两件。从构思、故事梗概到每一针每一线，直至最后装裱，都由艺术家亲手完成。', '[艺术家手记——待提供]'],
    dl: [['艺术家', 'Kim Baneul · 综合材料、纤维艺术'], ['材料', '纸上刺绣 [待确认]'], ['系列', 'Take 1 · Take 2（五件中的两件）']],
    credit: '© Kim Baneul。作品图像经艺术家许可使用，画面中的线条由原作照片转描而成。五个人物的场景插图为经艺术家许可的展览插画，五人均为虚构人物（展览文案）。',
    end: '今天，你的线<br>系在哪里？', exit: '离开展览星球',
    help: '如果你感到难以承受，请联系当地的心理援助热线或咨询机构。',
    sndOn: '开启声音', sndOff: '关闭声音',
  },
  ja: {
    title: '一縷の望み', by: 'Kim Baneul · ミクストメディア · テキスタイルアート', hint: 'ゆっくりスクロールしてください',
    caps: ['白い紙の上、部屋の片隅。<br>ひとりが膝を抱えて座っています。', 'そして、顔を上げます。', 'あそこに、赤い糸が一本。'],
    heroAlt: 'Kim Baneul《一縷の望み》Take 1・2。部屋の片隅でうずくまる人が顔を上げ、赤い糸を見る。',
    nums: ['一', '二', '三', '四', '五'], fiction: '架空の人物 · 展示文',
    people: [
      ['午前四時のリヤカー', 'チョンオク', ['午前四時、チョンオクさんの一日はリヤカーの車輪の音で始まります。', '路地ごとに出された段ボールをたたんで積み、古紙回収業者の秤に載せます。その日の稼ぎは、二人の娘のご飯代になります。', 'チョンオクさんは今日も夕食を抜きます。リヤカーの取っ手には、下の娘が置いていった髪ゴムが結ばれています。']],
      ['夜十一時のコンビニ', 'ミンジェ', ['ミンジェさんは一晩中コンビニを守っています。', '夜明けが近づくと、空の段ボールを一つずつたたんで、ドアのそばに積んでおきます。誰が持っていくのかは、はっきり知りません。', 'ただ、朝になると段ボールはなくなっていて、ときどきドアの前に飴がひとつ置かれています。']],
      ['始発', 'ヨンホ', ['ヨンホさんは始発バスを運転します。停留所ごとに、同じ顔が同じ席に座ります。', '仕事を終えると療養病院に寄り、もうヨンホさんのことがよく分からない妻のそばに座ります。', 'そしてマフラーを編みます。一日に一段ずつ。冬が来る前に仕上げたくて。']],
      ['午後のビデオ通話', 'ラン', ['ランさんはヨンホさんのバスの常連です。いつもいちばん後ろの窓際でうとうとしてから降ります。', '工場の休憩時間、ランさんはスマホの画面の中の娘と話します。', '手首の糸のブレスレットは、国を出る日に娘が結んでくれたものです。「ママ、これがほどけたら帰ってくるんだよ」ブレスレットはまだ固く結ばれています。']],
      ['ドアノブの袋', 'ソユン', ['ソユンさんはもう何日も部屋の外に出られずにいます。理由を説明するのも難しいのです。', '夕方になるとドアノブが少し揺れ、足音が遠ざかっていきます。ドアを開けると、おかずの入った袋が掛かっています。', '赤い紐で固く結ばれた結び目。隣のおばあさんの結び目です。']],
    ],
    bg: ['韓国では、道端の段ボールや古紙を集めて暮らしを立てる高齢者が少なくありません。', '韓国のコンビニは夜通し開いていて、多くの若者が夜勤で働いています。', '始発バスは夜明け前に出発し、早朝の仕事へ向かう人々を運びます。', '韓国の工場で働く外国人労働者の多くは、子どもと遠く離れて暮らしています。', 'パンチャン（おかず）は韓国の食卓に毎回並ぶ小皿料理で、近所同士でよく分け合います。'],
    retNo: 'もう一度、あの部屋', ret: ['糸はドアの隙間から入り、部屋の片隅にたどり着きます。', '一縷の望みは大きくありません。<br>ただ、途切れないだけです。'],
    retAlt: 'もう一度あの部屋。赤い糸がうずくまる人の足もとに届く。', knot: '糸の端に結び目をつくる', knotDone: '結び目ができました',
    blankH: 'まだ刺繍されていない章', blank: '《一縷の望み》は五点からなる連作です。残りの三点は、作家がいま刺繍しています。', blankAlt: 'まだ刺繍されていない',
    p2No: 'PART 2 · 作品と作家', p2H: 'Kim Baneul《一縷の望み》',
    p2: ['白い紙に針と糸で線を刺繍します。五点の連作のうち、最初の二点です。構想とあらすじから一針一針の糸、最後の額装まで、作家自身が手がけました。', '[作家ノート — 作家から受け取る予定]'],
    dl: [['作家', 'Kim Baneul · ミクストメディア、テキスタイルアート'], ['素材', '紙に糸 [確認予定]'], ['連作', 'Take 1 · Take 2（全5点のうち2点）']],
    credit: '© Kim Baneul。作品画像は作家の許可を得て使用しており、画面の線は原作の写真から写し取ったものです。五人の場面の絵は作家の許可を得た展示用イラストで、五人は架空の人物です（展示文）。',
    end: '今日、あなたの糸は<br>どこに結ばれていますか。', exit: '展示の惑星を出る',
    help: 'つらいときは、お住まいの地域の相談窓口や電話相談に連絡してください。',
    sndOn: '音をオン', sndOff: '音をオフ',
  },
};
const T = TEXT[lang] || TEXT.ko;
const PEOPLE = IDS.map(([id, age], i) => ({ id, age, no: T.nums[i], time: T.people[i][0], who: T.people[i][1], body: T.people[i][2], bg: T.bg[i] || '' }));

// ───────── 원작 선(벡터) 불러오기 ─────────
async function inkPath(name) {
  const t = await (await fetch(`assets/silnat/${name}-ink.svg?v=1`)).text();
  return t.match(/ d="([^"]+)"/)[1];
}
const T1_SHIFT = [-46, 32];           // Take 1 인물을 Take 2 인물 자리에 맞춤(628×656 기준)
const FIG1 = '88,250 230,240 345,255 380,380 378,562 86,562 76,400';     // Take 1 인물 둘레(676×650)
const FIG2 = '52,282 196,272 318,296 334,420 326,592 56,596 40,450';     // Take 2 인물 둘레
const STUB = [[531, 548], [534, 532], [529, 521], [533, 512]];             // Take 2의 붉은 실

function takeDefs(d1, d2) {
  return `<defs>
<path id="t1ink" d="${d1}" fill="#151413" fill-rule="evenodd"/>
<path id="t2ink" d="${d2}" fill="#151413" fill-rule="evenodd"/>
<clipPath id="c-fig1"><polygon points="${FIG1}"/></clipPath>
<clipPath id="c-fig2"><polygon points="${FIG2}"/></clipPath>
<mask id="m-room1" maskUnits="userSpaceOnUse" x="-100" y="-100" width="900" height="900"><rect x="-100" y="-100" width="900" height="900" fill="#fff"/><polygon points="${FIG1}" fill="#000"/></mask>
<mask id="m-room2" maskUnits="userSpaceOnUse" x="-100" y="-100" width="900" height="900"><rect x="-100" y="-100" width="900" height="900" fill="#fff"/><polygon points="${FIG2}" fill="#000"/></mask>
<filter id="sl-soft"><feGaussianBlur stdDeviation="1"/></filter>
<filter id="pp"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .52  0 0 0 0 .47  0 0 0 .07 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
</defs>`;
}
// 방(가만히) + 인물(숨 쉼)
const takeGroup = (n, id, extra = '') =>
  `<g id="${id}" ${extra}><use href="#t${n}ink" mask="url(#m-room${n})"/>` +
  `<g class="fig" clip-path="url(#c-fig${n})"><g class="breathe"><use href="#t${n}ink"/></g></g></g>`;
const paper = (w, h) => `<rect width="${w}" height="${h}" fill="#F3F0E8"/><rect width="${w}" height="${h}" filter="url(#pp)"/>`;

// ───────── 페이지 만들기 ─────────
const story = $('#story');
function build(d1, d2) {
  const persons = PEOPLE.map((p) => `
<section class="sl-person" data-scene="${p.id}">
  <div class="art">${sceneSVG(p.id, { noRed: true, label: `${p.time} — ${p.who}` })}</div>
  <div class="card reveal">
    <p class="no">${p.no} · ${p.time}</p>
    <h2>${p.who}<small>${p.age}</small></h2>
    ${p.body.map((t) => `<p>${t}</p>`).join('')}
    ${p.bg ? `<p class="bgline">${p.bg}</p>` : ''}
    <p class="note">${T.fiction}</p>
  </div>
</section>`).join('');
  story.innerHTML = `
<section class="sl-hero alive" id="hero">
  <div class="stick">
    <div class="intro"><h1>${T.title}</h1><p class="by">${T.by}</p><p class="hint">${T.hint}</p></div>
    <svg class="take" id="heroSvg" viewBox="0 0 628 656" role="img" aria-label="${T.heroAlt}">
      ${takeDefs(d1, d2)}${paper(628, 656)}
      <clipPath id="c-in"><rect id="inRect" x="0" y="0" width="628" height="0"/></clipPath>
      <g clip-path="url(#c-in)">
        <g id="h1" transform="translate(${T1_SHIFT})">${takeGroup(1, 'h1in')}</g>
        <g id="h2" opacity="0">${takeGroup(2, 'h2in')}</g>
      </g>
      <g id="stub" opacity="0">${redThread(STUB, 3, { width: 2.4 })}</g>
    </svg>
    <div class="cap">
      ${T.caps.map((c, i) => `<p data-cap="${i + 1}">${c}</p>`).join('')}
    </div>
  </div>
</section>
${persons}
<section class="sl-return alive" id="ret">
  <svg class="take" id="retSvg" viewBox="0 0 628 656" role="img" aria-label="${T.retAlt}">
    ${paper(628, 656)}${takeGroup(2, 'r2')}<g id="knot"></g>
  </svg>
  <div class="card reveal">
    <p class="no">${T.retNo}</p>
    ${T.ret.map((t) => `<p>${t}</p>`).join('')}
    <button class="knot-btn" type="button">${T.knot}</button>
  </div>
</section>
<section class="sl-blank">
  <div class="row">${[1, 2, 3].map((i) => `<div>${sceneSVG('blank', { label: `Take ${i + 2}, ${T.blankAlt}` })}</div>`).join('')}</div>
  <div class="card reveal"><p class="no">TAKE 3 · 4 · 5</p><h2>${T.blankH}</h2>
    <p>${T.blank}</p></div>
</section>
<section class="sl-part2">
  <div class="works">
    <figure><svg viewBox="0 0 676 650" role="img" aria-label="Take 1">${paper(676, 650)}<use href="#t1ink"/></svg><figcaption>Take 1</figcaption></figure>
    <figure><svg viewBox="0 0 628 656" role="img" aria-label="Take 2">${paper(628, 656)}<use href="#t2ink"/>${redThread(STUB, 3, { width: 2.4, flat: true })}</svg><figcaption>Take 2</figcaption></figure>
  </div>
  <div class="card reveal">
    <p class="no">${T.p2No}</p>
    <h2>${T.p2H}</h2>
    ${T.p2.map((t) => `<p>${t}</p>`).join('')}
    <dl>${T.dl.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    <p class="note">${T.credit}</p>
  </div>
</section>
<section class="sl-end">
  <p>${T.end}</p>
  <a class="sl-back" href="./">${T.exit}</a>
  <p class="help">${T.help}</p>
</section>`;
}

// ───────── 붉은 실 한 줄 ─────────
const th = $('#thread');
let PATH = null; // { pts, len[], ey[], total }
let shown = 0, needle = null;

const pageBox = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; };
const mapVB = (box, vb, [x, y]) => [box.x + (x - vb[0]) / vb[2] * box.w, box.y + (y - vb[1]) / vb[3] * box.h];

function route(a, b, gapY, L, R) {
  // a에서 가까운 가장자리로 나가 세로로 내려가고, 장면 사이 빈 곳(gapY)에서만 건너가 b로 들어감
  const ea = a[0] < (L + R) / 2 ? L : R, eb = b[0] < (L + R) / 2 ? L : R;
  const pts = [a, [ea + (a[0] > ea ? 6 : -6), a[1] + 36], [ea, Math.min(gapY - 60, Math.max(a[1] + 80, gapY - 60))]];
  if (ea !== eb) pts.push([(ea + eb) / 2 + (eb > ea ? -20 : 20), gapY + 6], [eb, gapY + 60]);
  pts.push([eb, Math.max(gapY + 100, b[1] - 50)], b);
  return curve(pts, 16).slice(1);
}

function buildThread() {
  const W = document.documentElement.clientWidth, vh = innerHeight;
  const hero = $('#hero'), stick = $('.stick', hero), svg = $('#heroSvg');
  const hb = pageBox(hero), sb = svg.getBoundingClientRect(), kb = stick.getBoundingClientRect();
  // 스티키가 끝날 때의 원작 위치
  const heroSvgBox = { x: sb.left + scrollX, y: hb.y + hb.h - vh + (sb.top - kb.top), w: sb.width, h: sb.height };
  const VB = [0, 0, 628, 656];
  const edges = (el) => { const bx = pageBox(el); return [Math.max(12, bx.x - 22), Math.min(W - 12, bx.x + bx.w + 22)]; };
  let pts = [mapVB(heroSvgBox, VB, STUB[0]), mapVB(heroSvgBox, VB, [560, 600]), mapVB(heroSvgBox, VB, [628, 640])];
  for (const sec of document.querySelectorAll('.sl-person')) {
    const art = $('.art svg', sec), box = pageBox(art), vb = [-60, -60, 1120, 1120];
    const [L, R] = edges(art);
    const sp = SCENES[sec.dataset.scene]().red.map((p) => mapVB(box, vb, p)).map(([x, y]) => [Math.max(L, Math.min(R, x)), y]);
    const gapY = pageBox(sec).y + innerHeight * .08;
    pts.push(...route(pts[pts.length - 1], sp[0], gapY, L, R), ...sp.slice(1));
  }
  // 다시 그 방: 오른쪽 구석으로 들어와 발치까지
  const retSvg = $('#retSvg'), rb = pageBox(retSvg), [L, R] = edges(retSvg);
  const into = [[640, 470], [600, 520], [531, 548], [470, 575], [400, 584], [338, 580]].map((p) => mapVB(rb, VB, p));
  into[0][0] = Math.min(R, into[0][0]);
  pts.push(...route(pts[pts.length - 1], into[0], pageBox($('#ret')).y + innerHeight * .08, L, R), ...curve(into, 10).slice(1));
  // 길이와 '나타날 높이'(가로로 가거나 감길 때는 조금 늦게 = 그 자리에 머묾)
  const len = [0], ey = [pts[0][1]];
  for (let i = 1; i < pts.length; i++) {
    const s = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    len.push(len[i - 1] + s);
    ey.push(Math.max(ey[i - 1] + s * .3, pts[i][1]));
  }
  PATH = { pts, len, ey, total: len[len.length - 1], end: pts[pts.length - 1] };
  const H = document.documentElement.scrollHeight;
  PATH.W = W;
  // 실을 짧은 조각으로 나눠, 화면에 보이는 조각만 그리고 바늘이 지나는 조각에만 가림막(mask)을 씀
  const chunks = [];
  for (let i = 0; i < pts.length - 1;) {
    let j = i + 1; while (j < pts.length - 1 && len[j] - len[i] < 280) j++;
    const seg = pts.slice(i, j + 1), ys = seg.map((q) => q[1]);
    chunks.push({ i, j, L0: len[i], L1: len[j], y0: Math.min(...ys) - 40, y1: Math.max(...ys) + 40, seg });
    i = j;
  }
  // 조각마다 작은 SVG를 제자리에 둠 → 스크롤할 때는 다시 그리지 않고 옮기기만 함
  th.style.height = document.documentElement.scrollHeight + 'px';
  th.innerHTML = chunks.map((c, k) => {
    const d = 'M' + c.seg.map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join('L'), L = c.L1 - c.L0, h = c.y1 - c.y0;
    return `<svg class="ch" style="top:${c.y0.toFixed(0)}px;height:${h.toFixed(0)}px;display:none" viewBox="0 ${c.y0.toFixed(0)} ${W} ${h.toFixed(0)}" width="${W}" height="${h.toFixed(0)}">` +
      `<defs><mask id="rv${k}" maskUnits="userSpaceOnUse" x="0" y="${c.y0}" width="${W}" height="${h}"><path d="${d}" stroke="#fff" stroke-width="28" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${L.toFixed(1)} ${(L + 60).toFixed(1)}" stroke-dashoffset="${L.toFixed(1)}"/></mask></defs>` +
      `<g>${redThread(c.seg, 11 + k, { width: 4, flat: true })}</g></svg>`;
  }).join('') + `<svg id="needle" class="needle" viewBox="-32 -8 46 16" width="46" height="16" style="opacity:0"><path d="M-30 0 L6 0" stroke="#8a8580" stroke-width="2" stroke-linecap="round"/><ellipse cx="-24" cy="0" rx="4" ry="1.6" fill="none" stroke="#8a8580" stroke-width="1.2"/><path d="M6 0 L12 0" stroke="#b9b4ae" stroke-width="1.3" stroke-linecap="round"/></svg>`;
  const svgs = th.querySelectorAll('svg.ch');
  chunks.forEach((c, k) => { c.svg = svgs[k]; c.g = svgs[k].querySelector('g'); c.m = svgs[k].querySelector('mask path'); c.k = k; c.state = ''; });
  PATH.chunks = chunks;
  needle = $('#needle', th);
  shown = Math.min(shown, PATH.total);
}

function targetLen() {
  const t = scrollY + innerHeight * .64;
  const { ey, len } = PATH;
  if (t <= ey[0]) return 0;
  let lo = 0, hi = ey.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ey[m] <= t) lo = m; else hi = m - 1; }
  if (lo >= ey.length - 1) return PATH.total;
  const f = (t - ey[lo]) / Math.max(1, ey[lo + 1] - ey[lo]);
  return len[lo] + (len[lo + 1] - len[lo]) * Math.min(1, f);
}
function pointAt(L) {
  const { len, pts } = PATH;
  let lo = 0, hi = len.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (len[m] <= L) lo = m; else hi = m - 1; }
  const a = pts[lo], b = pts[Math.min(lo + 1, pts.length - 1)];
  const f = (L - len[lo]) / Math.max(.001, (len[lo + 1] ?? len[lo]) - len[lo]);
  return [a[0] + (b[0] - a[0]) * Math.min(1, f), a[1] + (b[1] - a[1]) * Math.min(1, f), Math.atan2(b[1] - a[1], b[0] - a[0])];
}

// ───────── 첫 장면(스크롤 진행도) ─────────
const ease = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
function heroFrame() {
  const hero = $('#hero'); if (!hero) return;
  const r = hero.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
  $('.intro', hero).style.opacity = String(1 - ease((p - .06) / .08));
  $('#inRect').setAttribute('height', String(656 * ease((p - .04) / .14)));
  const t = ease((p - .44) / .14);
  $('#h1').setAttribute('transform', `translate(${T1_SHIFT[0]} ${T1_SHIFT[1] - 6 * t})`);
  $('#h1').setAttribute('opacity', String(1 - t));
  $('#h2').setAttribute('transform', `translate(0 ${6 * (1 - t)})`);
  $('#h2').setAttribute('opacity', String(t));
  $('#stub').setAttribute('opacity', String(ease((p - .66) / .1)));
  const cap = p < .12 ? 0 : p < .4 ? 1 : p < .5 ? 0 : p < .7 ? 2 : 3;
  hero.querySelectorAll('.cap p').forEach((el) => el.classList.toggle('on', +el.dataset.cap === cap));
}

// ───────── 소리(아주 작게, 끌 수 있음) ─────────
let ac = null, rustle = null;
function soundOn() {
  if (ac) { ac.resume(); return; }
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = .7;
  rustle = ac.createGain(); rustle.gain.value = 0;
  src.connect(bp).connect(rustle).connect(ac.destination); src.start();
}
function pluck() {
  if (!ac || ac.state !== 'running') return;
  const o = ac.createOscillator(), g = ac.createGain(), now = ac.currentTime;
  o.frequency.setValueAtTime(220, now); o.frequency.exponentialRampToValueAtTime(140, now + .4);
  g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(.12, now + .01); g.gain.exponentialRampToValueAtTime(.0001, now + .6);
  o.connect(g).connect(ac.destination); o.start(now); o.stop(now + .7);
}
const sndBtn = $('.sl-snd');
sndBtn.textContent = T.sndOn;
$('.sl-title').textContent = T.title;
document.title = `${T.title} — ${lang === 'ko' ? '김바늘' : 'Kim Baneul'} | ARTMOS`;
langSwitcher($('.sl-top'), { before: sndBtn, cls: 'sl-lang' });
let sndOn = false;
sndBtn.addEventListener('click', () => {
  sndOn = !sndOn; sndBtn.setAttribute('aria-pressed', String(sndOn)); sndBtn.textContent = sndOn ? T.sndOff : T.sndOn;
  if (sndOn) soundOn(); else if (ac) ac.suspend();
});
document.addEventListener('visibilitychange', () => { if (ac && sndOn) document.hidden ? ac.suspend() : ac.resume(); });

// ───────── 매 프레임 ─────────
let lastY = scrollY, ticking = false;
function frame() {
  ticking = false;
  heroFrame();
  if (!PATH) return;
  const target = targetLen();
  shown += (target - shown) * (RM ? 1 : .18);
  if (Math.abs(target - shown) < .5) shown = target;
  const top = scrollY - 60, bot = scrollY + innerHeight + 60;
  for (const c of PATH.chunks) {
    const vis = shown > c.L0 && c.y1 > top && c.y0 < bot;
    const st = !vis ? 'off' : shown >= c.L1 ? 'full' : 'part';
    if (st !== c.state) {
      c.svg.style.display = st === 'off' ? 'none' : '';
      if (st === 'part') c.g.setAttribute('mask', `url(#rv${c.k})`); else c.g.removeAttribute('mask');
      c.state = st;
    }
    if (st === 'part') c.m.setAttribute('stroke-dashoffset', String((c.L1 - c.L0) - (shown - c.L0)));
  }
  const [x, y, a] = pointAt(shown);
  needle.style.opacity = shown > 2 && shown < PATH.total - 2 ? '1' : '0';
  needle.style.transform = `translate(${(x - 32).toFixed(1)}px, ${(y - 8).toFixed(1)}px) rotate(${(a * 180 / Math.PI).toFixed(1)}deg)`;
  if (rustle && sndOn) { const v = Math.min(1, Math.abs(scrollY - lastY) / 40); rustle.gain.setTargetAtTime(v * .035, ac.currentTime, .05); }
  lastY = scrollY;
  if (Math.abs(target - shown) > .5) request();
}
const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
addEventListener('scroll', request, { passive: true });

let lastW = 0, rt = 0;
addEventListener('resize', () => {
  const w = document.documentElement.clientWidth;
  if (w === lastW) return; // 주소창 때문에 높이만 바뀌면 무시
  lastW = w; clearTimeout(rt); rt = setTimeout(() => { buildThread(); request(); }, 150);
});

// ───────── 시작 ─────────
(async () => {
  const [d1, d2] = await Promise.all([inkPath('take1'), inkPath('take2')]);
  build(d1, d2);
  lastW = document.documentElement.clientWidth;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  buildThread(); frame();
  if (document.fonts) document.fonts.ready.then(() => { buildThread(); request(); });
  // 글 나타나기
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  // 화면 밖 원작은 숨 쉬기를 멈춤
  const live = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('alive', e.isIntersecting && !RM)));
  document.querySelectorAll('.sl-hero, .sl-return').forEach((el) => live.observe(el));
  // 매듭
  const kb = $('.knot-btn');
  kb.addEventListener('click', () => {
    kb.disabled = true; kb.textContent = T.knotDone;
    $('#knot').innerHTML = redThread(loop(338, 578, 6, 4, 1.4, 0, 30), 21, { width: 2.6, flat: true });
    pluck();
  });
  // 나가기
  document.querySelectorAll('.sl-back').forEach((a) => a.addEventListener('click', (e) => {
    if (e.defaultPrevented) return; // 앱 안이면 i18n.js가 이미 '전시 닫기'를 보냄
    if (IN_FRAME) { e.preventDefault(); try { parent.postMessage({ type: 'artmos:close-exhibit' }, '*'); } catch (err) {} setTimeout(() => (location.href = './'), 600); }
  }));
})();
