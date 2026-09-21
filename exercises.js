/* ==========================================================================
   动作数据库
   --------------------------------------------------------------------------
   这是整个网站唯一需要你手动维护的文件。
   每加一个动作，就往数组里加一段 { ... }。

   字段说明：
     id                  唯一英文标识，只能用小写字母和横线，不能重复
     name                动作名称
     aliases             别名数组（越多越好，用户搜什么都能命中）
     primaryMuscle       主要肌群（决定筛选器里的选项，同一类要写一样）
     secondaryMuscles    次要肌群
     equipment           器械数组（无器械写 "无器械"）

   ── 器械命名约定（用户定的，以后新增动作一律照这个写）──
     · 统一用「龙门架」，不要写「拉力器」（同一个东西，全库只留一个叫法）
     · 已是正式值的还有：无器械 / 哑铃 / 杠铃 / 单杠 / 龙门架 / 器械 / 卧推凳 / 深蹲架 / 罗马椅 / 史密斯机 / 双杠 / 蝴蝶机
     · 要加新器械值，先确认它在库里还没别的写法；同一台器械只能有一种叫法
     category            类别：力量 / 有氧 / 核心 / 拉伸 / 热身
     difficulty          难度：入门 / 进阶 / 高阶
     metrics             计量单位：次 / 秒 / 分钟 / 距离
     video               视频外链（B站地址，暂时可留空字符串）

   ── 以下四个字段是可选的，没写就整段不写，页面一样正常 ──
     contraindication    禁忌人群 / 注意事项
     steps               动作步骤，字符串数组
     mistakes            常见错误，字符串数组
     tips                提示，字符串数组
   ========================================================================== */

window.EXERCISES = [
  {
    id: 'dumbbell-row',
    name: '哑铃单臂划船',
    aliases: ['单臂划船', '单手划船', '单手哑铃划船', '哑铃划船', '俯身哑铃划船',
              'One-arm Dumbbell Row', 'Bent-over Dumbbell Row'],
    primaryMuscle: '背',
    secondaryMuscles: ['肱二头肌', '后束三角肌'],
    equipment: ['哑铃'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: '',
    contraindication: '腰椎间盘突出、急性腰痛发作期慎做。',
    steps: [
      '一只手和同侧膝盖撑在长凳上，另一只脚踩地，另一只手握哑铃自然下垂',
      '背部保持平直，核心收紧，肩胛先微微下沉',
      '肘部贴近身体，把哑铃沿身体侧面拉到腰腹位置',
      '顶峰收缩 1 秒，感受背部发力',
      '控制速度缓慢下放，直到手臂完全伸展'
    ],
    mistakes: [
      '用手臂发力，变成"甩"而不是"拉"',
      '身体跟着旋转借力，腰背失去稳定',
      '下放时耸肩，肩胛没有下沉',
      '拉的幅度过小，肘部没有超过背部平面'
    ],
    tips: [
      '重量以能标准完成 10–12 次为宜，宁轻不重',
      '想象"用肘部去顶身后的人"，比"用手拉"更容易找到背部发力'
    ]
  },
  {
    id: 'barbell-bench-press',
    name: '杠铃卧推',
    aliases: ['卧推', '平板卧推', 'Bench Press', '杠铃平板卧推'],
    primaryMuscle: '胸',
    secondaryMuscles: ['肱三头肌', '前束三角肌'],
    equipment: ['杠铃', '卧推凳'],
    category: '力量',
    difficulty: '进阶',
    metrics: '次',
    video: '',
    contraindication: '肩关节有伤、肩峰撞击史者需在专业指导下进行，建议先用哑铃替代。',
    steps: [
      '仰卧在卧推凳上，眼睛位于杠铃正下方，双脚踩实地面',
      '肩胛骨后缩下沉，形成稳定的支撑面，腰部保留自然弧度',
      '双手握距略宽于肩，全握杠铃，手腕保持中立不后折',
      '出杠后将杠铃下放到胸骨中下部，肘部约 45–75 度夹角',
      '轻触胸口后，用胸部和三头肌发力推起，路径略呈斜线'
    ],
    mistakes: [
      '肘部完全打开成 90 度，肩关节压力过大',
      '腰部过度拱起，臀部离开凳面',
      '手腕后折，力量传导效率低且易伤腕',
      '没有保护架或保护者就上大重量'
    ],
    tips: [
      '大重量务必使用安全架或有保护者，这是不可妥协的一条',
      '杠铃下放速度慢于推起速度，控制比重量更重要'
    ]
  },
  {
    id: 'dumbbell-bench-press',
    name: '哑铃卧推',
    aliases: ['哑铃平板卧推', '平板哑铃卧推', 'Dumbbell Bench Press', '哑铃推胸'],
    primaryMuscle: '胸',
    secondaryMuscles: ['肱三头肌', '前束三角肌'],
    equipment: ['哑铃', '卧推凳'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: '',
    contraindication: '肩关节不稳者注意控制下放深度，不要超过身体舒适范围。',
    steps: [
      '坐在卧推凳上，哑铃放在大腿上，靠腿部帮助躺下',
      '肩胛后缩下沉，双手握哑铃置于胸部两侧',
      '手腕保持中立，小臂垂直于地面',
      '胸部发力将哑铃向上推起，顶端不锁死肘关节',
      '控制下放，直到上臂与地面接近平行'
    ],
    mistakes: [
      '哑铃在顶端相碰，失去持续张力',
      '下放过深，肩关节过度牵拉',
      '腰部离凳，变成"挺髋推举"'
    ],
    tips: [
      '哑铃比杠铃活动范围更大，对胸肌刺激更充分，适合新手建立感觉',
      '结束时把哑铃先放到大腿上再坐起，不要直接甩开'
    ]
  },
  {
    id: 'goblet-squat',
    name: '高脚杯深蹲',
    aliases: ['杯式深蹲', 'Goblet Squat', '哑铃深蹲'],
    primaryMuscle: '腿',
    secondaryMuscles: ['臀', '核心'],
    equipment: ['哑铃', '壶铃'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: '',
    contraindication: '膝关节疼痛、半月板损伤者需减小幅度或咨询专业人士。',
    steps: [
      '双手捧住哑铃一端，贴于胸前，双脚与肩同宽，脚尖略外展',
      '核心收紧，挺胸，视线看向前方',
      '髋部向后向下坐，膝盖沿脚尖方向推开',
      '下蹲至大腿接近与地面平行，或到你能保持背部中立的最低点',
      '脚跟发力站起，臀部收紧'
    ],
    mistakes: [
      '膝盖内扣，没有顺着脚尖方向打开',
      '脚跟离地，重心过度前移',
      '下蹲时腰部弯曲（屁股眨眼）',
      '重量太轻，胸前配重失去平衡作用'
    ],
    tips: [
      '高脚杯深蹲是最好的深蹲入门动作，配重在前有助于保持躯干直立',
      '蹲不下去多半是踝关节活动度问题，可以先垫高脚跟练习'
    ]
  },
  {
    id: 'barbell-squat',
    name: '杠铃深蹲',
    aliases: ['深蹲', '杠铃后蹲', 'Back Squat', '负重深蹲'],
    primaryMuscle: '腿',
    secondaryMuscles: ['臀', '核心', '背'],
    equipment: ['杠铃', '深蹲架'],
    category: '力量',
    difficulty: '高阶',
    metrics: '次',
    video: '',
    contraindication: '腰椎、膝关节有伤病史者务必在专业指导下进行，务必使用安全杆。',
    steps: [
      '调整深蹲架高度，杠铃置于斜方肌上部（高杠）或后束三角肌（低杠）',
      '双手握杠，肩胛收紧，挺胸抬头出杠，后退两小步站稳',
      '双脚与肩同宽或略宽，脚尖外展约 15–30 度',
      '吸气憋住（瓦式呼吸），髋膝同时屈曲下蹲',
      '蹲至大腿与地面平行或略低，保持背部中立',
      '脚掌蹬地起身，起身过程中保持膝盖不内扣'
    ],
    mistakes: [
      '重量超过能力，起身时"早安式"弯腰',
      '膝盖内扣或过度前移',
      '没有使用安全杆，力竭时无法脱杠',
      '呼吸紊乱，核心失去支撑'
    ],
    tips: [
      '先掌握徒手深蹲和高脚杯深蹲，再上杠铃',
      '第一年建议每周只增加 2.5–5% 的重量，进步慢但不容易受伤'
    ]
  },
  {
    id: 'deadlift',
    name: '硬拉',
    aliases: ['传统硬拉', 'Deadlift', '杠铃硬拉'],
    primaryMuscle: '腿',
    secondaryMuscles: ['臀', '背', '核心'],
    equipment: ['杠铃'],
    category: '力量',
    difficulty: '高阶',
    metrics: '次',
    video: '',
    contraindication: '腰椎间盘问题、高血压患者慎做；憋气发力会使血压骤升。',
    steps: [
      '双脚与髋同宽站立，杠铃位于脚掌中部正上方',
      '髋部向后推，屈髋屈膝握住杠铃，握距略宽于小腿',
      '肩胛位于杠铃正上方或略前，背部绷直，腋窝夹紧',
      '深吸气憋住，腿和背同时发力，杠铃贴着小腿和大腿向上',
      '站直时臀部收紧，不要过度后仰',
      '控制下放，沿原路径回到地面'
    ],
    mistakes: [
      '背部弓起，腰椎承受剪切力',
      '杠铃远离身体，力臂变长',
      '用腰把杠铃"拉"起来，而不是用腿"推"地面',
      '顶端过度后仰，压迫腰椎'
    ],
    tips: [
      '硬拉是技术要求最高的动作之一，建议前期一定找人看一次动作',
      '重量以能全程保持背部中立为准，宁可轻 20 公斤'
    ]
  },
  {
    id: 'pull-up',
    name: '引体向上',
    aliases: ['引体', '正手引体', 'Pull-up', '单杠引体'],
    primaryMuscle: '背',
    secondaryMuscles: ['肱二头肌', '核心'],
    equipment: ['单杠'],
    category: '力量',
    difficulty: '高阶',
    metrics: '次',
    video: '',
    contraindication: '肩袖损伤、肘关节疼痛者慎做。',
    steps: [
      '正手全握单杠，握距略宽于肩',
      '身体自然悬垂，肩胛先下沉收紧（先"沉肩"再拉）',
      '背部发力，肘部向下向后，把胸口拉向横杠',
      '下巴超过横杠后，控制速度下放至手臂伸展'
    ],
    mistakes: [
      '靠蹬腿、摆身体借力（那是 kipping，不是标准引体）',
      '半程动作，下放时没有充分伸展',
      '耸肩发力，斜方肌代偿'
    ],
    tips: [
      '做不了完整引体，先练"离心引体"：跳上去，用 5 秒慢慢放下来',
      '还可以用弹力带辅助，或用高位下拉过渡'
    ]
  },
  {
    id: 'push-up',
    name: '俯卧撑',
    aliases: ['伏地挺身', 'Push-up', '掌上压'],
    primaryMuscle: '胸',
    secondaryMuscles: ['肱三头肌', '核心', '前束三角肌'],
    equipment: ['无器械'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: '',
    contraindication: '手腕疼痛者可使用俯卧撑架或握拳支撑。',
    steps: [
      '双手撑地，略宽于肩，手指朝前，手腕位于肩膀正下方',
      '身体从头到脚跟成一条直线，臀部不塌不翘',
      '核心和臀部收紧，屈肘下降，肘部与躯干约 45 度',
      '胸口接近地面后，推起还原，顶端不锁死肘关节'
    ],
    mistakes: [
      '臀部塌陷或撅起，腰背失去中立',
      '手肘完全外展成 90 度',
      '幅度不足，只做一半',
      '低头看地，颈椎前引'
    ],
    tips: [
      '做不动可以先从跪姿俯卧撑或上斜俯卧撑（手撑高台）开始',
      '每组留 2 次的余力，比每组做到力竭更容易长期进步'
    ]
  },
  {
    id: 'plank',
    name: '平板支撑',
    aliases: ['平板', 'Plank', '支撑'],
    primaryMuscle: '核心',
    secondaryMuscles: ['腹横肌', '臀', '肩'],
    equipment: ['无器械'],
    category: '核心',
    difficulty: '入门',
    metrics: '秒',
    video: '',
    contraindication: '腰椎间盘问题者若感到腰部酸痛应立即停止。',
    steps: [
      '俯卧，双肘位于肩膀正下方，小臂平行贴地',
      '脚尖撑地，收紧臀部和腹部，把身体撑成一条直线',
      '目视地面略前方，颈椎保持中立',
      '均匀呼吸，不要憋气'
    ],
    mistakes: [
      '腰部下沉，腰椎受压（最常见的错误）',
      '臀部过高，变成"拱桥"',
      '憋气，血压升高',
      '头抬起看前方，颈椎后仰'
    ],
    tips: [
      '质量比时长重要：能标准撑 40 秒，比塌腰撑 3 分钟有用得多',
      '感到腰部发酸就是姿势塌了，立刻停止，休息后再来一组'
    ]
  },
  {
    id: 'dumbbell-shoulder-press',
    name: '哑铃肩推',
    aliases: ['肩推', '坐姿推举', '哑铃推举', '哑铃推肩', 'Dumbbell Shoulder Press'],
    primaryMuscle: '肩',
    secondaryMuscles: ['肱三头肌', '核心'],
    equipment: ['哑铃'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: '',
    contraindication: '肩峰撞击、肩袖损伤者建议改用中立握（掌心相对）或先咨询专业人士。',
    steps: [
      '坐姿或站姿，双手握哑铃举至肩部两侧，掌心朝前或相对',
      '核心收紧，腰背挺直，不要过度后仰',
      '肩部发力将哑铃向上推起，直到手臂接近伸直',
      '控制下放回到耳朵高度，保持张力'
    ],
    mistakes: [
      '腰部过度后仰，变成"上斜卧推"',
      '推起时耸肩',
      '下放位置过低，肩关节压力增大',
      '两侧速度不一致，重量不平衡'
    ],
    tips: [
      '坐姿加靠背更容易稳定，站姿对核心要求更高',
      '肩膀有响声但不痛通常无碍，若伴随疼痛立即停止'
    ]
  },
  {
    id: 'lateral-raise',
    name: '哑铃侧平举',
    aliases: ['侧平举', 'Lateral Raise', '哑铃侧举'],
    primaryMuscle: '肩',
    secondaryMuscles: ['斜方肌'],
    equipment: ['哑铃'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: '',
    contraindication: '肩部有弹响或疼痛者减小幅度，避免抬过肩。',
    steps: [
      '站姿，双手各持一只哑铃置于身体两侧，肘部微屈',
      '肩部中束发力，把哑铃向两侧抬起',
      '抬到与肩同高或略低即可，肘部略高于手腕',
      '控制下放，不要让哑铃直接掉下来'
    ],
    mistakes: [
      '重量太大，靠甩身体把哑铃荡起来',
      '抬起超过肩高，肩峰撞击风险增加',
      '肘部完全伸直，变成"直臂抬"'
    ],
    tips: [
      '侧平举用小重量、高次数效果更好，5–10 公斤往往就够',
      '想象"用肘部向外画弧线"，比"用手抬哑铃"更容易找到感觉'
    ]
  },
  {
    id: 'dumbbell-curl',
    name: '站姿哑铃弯举',
    aliases: ['哑铃弯举', '二头弯举', '哑铃二头弯举', '弯举', 'Dumbbell Curl'],
    primaryMuscle: '手臂',
    secondaryMuscles: ['肱二头肌', '小臂'],
    equipment: ['哑铃'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: '',
    contraindication: '肘关节或手腕腱鞘炎发作期慎做。',
    steps: [
      '站姿，双手各持一只哑铃，手臂自然下垂，掌心朝前',
      '上臂固定贴住身体两侧，肘部作为唯一活动关节',
      '肱二头肌发力把哑铃向上弯起',
      '顶峰收缩后控制下放，直到手臂接近伸直'
    ],
    mistakes: [
      '甩身体借力，变成"摆锤"',
      '上臂前后摆动，肘部位置不固定',
      '下放太快，失去离心刺激',
      '手腕弯曲代偿'
    ],
    tips: [
      '靠墙站或背贴柱子做，能有效防止身体借力',
      '弯举这类小肌群动作，8–15 次的次数区间比较合适'
    ]
  },
  {
    id: 'crunch',
    name: '卷腹',
    aliases: ['仰卧卷腹', 'Crunch', '腹部卷曲'],
    primaryMuscle: '核心',
    secondaryMuscles: ['腹直肌'],
    equipment: ['无器械'],
    category: '核心',
    difficulty: '入门',
    metrics: '次',
    video: '',
    contraindication: '颈椎有问题者注意不要用双手抱头拉脖子。',
    steps: [
      '仰卧屈膝，双脚踩地，双手轻放耳侧或交叉抱胸',
      '下巴微收，留出一个拳头的空间',
      '腹部发力，把肩胛骨卷离地面，下背始终贴地',
      '顶端停顿 1 秒，控制下放'
    ],
    mistakes: [
      '双手抱头用力拉脖子，颈椎代偿',
      '整个背都抬起来，变成仰卧起坐',
      '靠惯性甩起来，腹部没有持续发力'
    ],
    tips: [
      '幅度只要肩胛离地就够了，腰不要离地',
      '感觉脖子累说明发力位置错了，把注意力放到"卷肚子"上'
    ]
  },
  {
    id: 'russian-twist',
    name: '俄罗斯转体',
    aliases: ['坐姿转体', 'Russian Twist', '负重转体'],
    primaryMuscle: '核心',
    secondaryMuscles: ['腹斜肌'],
    equipment: ['哑铃'],
    category: '核心',
    difficulty: '进阶',
    metrics: '次',
    video: '',
    contraindication: '腰椎间盘问题者慎做旋转类动作。',
    steps: [
      '坐姿屈膝，双脚可离地或踩地，上身后仰约 45 度',
      '双手握住哑铃置于胸前',
      '核心收紧，带动躯干向一侧旋转，哑铃移到身体侧面',
      '控制回到中间，再转向另一侧，算一次'
    ],
    mistakes: [
      '只用手臂摆动，躯干没有旋转',
      '腰部弯曲驼背',
      '速度太快，失去控制'
    ],
    tips: [
      '新手先把脚踩地做，稳定后再尝试抬脚',
      '转动时想象"用肋骨去靠近髋骨"，而不是甩手'
    ]
  },
  {
    id: 'dead-bug',
    name: '死虫式',
    aliases: ['Dead Bug', '仰卧交替伸腿'],
    primaryMuscle: '核心',
    secondaryMuscles: ['腹横肌', '腰'],
    equipment: ['无器械'],
    category: '核心',
    difficulty: '入门',
    metrics: '次',
    video: '',
    contraindication: '无特殊禁忌，是腰痛康复期常用的安全动作。',
    steps: [
      '仰卧，双手向上伸直，双腿屈髋屈膝成 90 度',
      '下背压紧地面，腰椎不要离地',
      '缓慢伸出一侧手臂过头、同时伸直对侧腿',
      '回到起始位，换另一侧，交替进行'
    ],
    mistakes: [
      '腰部离开地面拱起',
      '动作太快，变成"蹬腿"',
      '憋气'
    ],
    tips: [
      '全程想象"腰下面压着一张纸，不能掉"',
      '这是保护腰椎最好的核心训练之一，适合腰痛人群'
    ]
  },
  {
    id: 'lat-pulldown',
    name: '高位下拉',
    aliases: ['下拉', 'Lat Pulldown', '背阔肌下拉'],
    primaryMuscle: '背',
    secondaryMuscles: ['肱二头肌', '后束三角肌'],
    equipment: ['龙门架'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: '',
    contraindication: '肩关节不稳者避免拉到颈后。',
    steps: [
      '坐好，大腿卡在固定垫下，双手正握横杆略宽于肩',
      '上身略后仰约 15 度，挺胸',
      '肩胛下沉，把横杆拉向锁骨上方',
      '顶峰收缩后控制还原，手臂充分伸展'
    ],
    mistakes: [
      '把杆拉到颈后，肩关节压力大',
      '身体大幅后仰借力，变成"划船"',
      '用手臂主导，背部没有参与'
    ],
    tips: [
      '做不了引体向上时，高位下拉是最好的替代',
      '拉的时候想"用肘部往下砸"，比"用手拉"更容易找到背'
    ]
  },
  {
    id: 'bent-over-lateral-raise',
    name: '俯身哑铃飞鸟',
    aliases: ['俯身飞鸟', '后束飞鸟', 'Bent-over Lateral Raise'],
    primaryMuscle: '肩',
    secondaryMuscles: ['背', '后束三角肌'],
    equipment: ['哑铃'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: '',
    contraindication: '腰部不适者可趴在斜凳上做，减轻腰部负担。',
    steps: [
      '双脚与髋同宽，屈髋前倾至上身接近平行地面，背部挺直',
      '双手持哑铃自然下垂，肘部微屈',
      '肩部后束发力，把哑铃向两侧抬起',
      '抬到与肩同高，控制下放'
    ],
    mistakes: [
      '腰部弯曲驼背，而不是屈髋',
      '用斜方肌耸肩上提',
      '重量太大，靠甩身体'
    ],
    tips: [
      '后束三角肌平时练得少，圆肩驼背的人尤其需要补这个动作',
      '小重量、慢速度，感受肩后侧发力'
    ]
  },
  {
    id: 'overhead-triceps-extension',
    name: '哑铃颈后臂屈伸',
    aliases: ['颈后臂屈伸', '三头肌屈伸', 'Overhead Triceps Extension'],
    primaryMuscle: '手臂',
    secondaryMuscles: ['肱三头肌'],
    equipment: ['哑铃'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: '',
    contraindication: '肩关节活动度不足或肩部有伤者慎做，可改用绳索下压。',
    steps: [
      '坐姿或站姿，双手捧住一只哑铃的一端，举过头顶',
      '上臂贴近耳朵并固定，肘部朝前',
      '肘部弯曲，把哑铃缓慢下放到头后',
      '肱三头肌发力伸直手臂，顶端不锁死'
    ],
    mistakes: [
      '上臂前后摆动，肘部位置不固定',
      '腰部过度后仰',
      '下放速度太快，失去控制'
    ],
    tips: [
      '上臂固定是关键，想象"胳膊肘被夹住了"',
      '重量不宜过大，这个动作对肘关节比较敏感'
    ]
  },

  {
    id: 'high-row',
    name: '高位划船',
    aliases: ['高位拉背'],
    primaryMuscle: '背',
    secondaryMuscles: ['后束三角肌', '肱二头肌'],
    equipment: ['龙门架'],
    category: '力量',
    difficulty: '进阶',
    metrics: '次',
    video: ''
  },
  {
    id: 'cable-close-row',
    name: '绳索窄距划船',
    aliases: [],
    primaryMuscle: '背',
    secondaryMuscles: ['肱二头肌', '后束三角肌'],
    equipment: ['龙门架'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'single-arm-cable-row',
    name: '单臂绳索划船',
    aliases: [],
    primaryMuscle: '背',
    secondaryMuscles: ['肱二头肌', '后束三角肌'],
    equipment: ['龙门架'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'single-arm-machine-row',
    name: '固定单臂划船',
    aliases: [],
    primaryMuscle: '背',
    secondaryMuscles: ['肱二头肌', '后束三角肌'],
    equipment: ['器械'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'seal-row',
    name: '海豹划船',
    aliases: [],
    primaryMuscle: '背',
    secondaryMuscles: ['后束三角肌', '肱二头肌'],
    equipment: ['杠铃', '卧推凳'],
    category: '力量',
    difficulty: '进阶',
    metrics: '次',
    video: ''
  },
  {
    id: 'track-row',
    name: '轨道划船',
    aliases: [],
    primaryMuscle: '背',
    secondaryMuscles: ['肱二头肌', '后束三角肌'],
    equipment: ['器械'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 't-bar-row',
    name: 'T杆划船',
    aliases: ['T杠划船', 'T字划船'],
    primaryMuscle: '背',
    secondaryMuscles: ['后束三角肌', '肱二头肌'],
    equipment: ['杠铃'],
    category: '力量',
    difficulty: '进阶',
    metrics: '次',
    video: ''
  },
  {
    id: 'cable-pulldown',
    name: '钢线下拉',
    aliases: [],
    primaryMuscle: '背',
    secondaryMuscles: ['肱二头肌'],
    equipment: ['龙门架'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'flex-car-pulldown',
    name: 'Flex跑车拉背',
    aliases: [],
    primaryMuscle: '背',
    secondaryMuscles: ['肱二头肌', '后束三角肌'],
    equipment: [],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'scissor-back',
    name: '大剪刀',
    aliases: [],
    primaryMuscle: '背',
    secondaryMuscles: [],
    equipment: [],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'back-extension',
    name: '山羊挺身',
    aliases: ['罗马椅挺身'],
    primaryMuscle: '背',
    secondaryMuscles: ['臀', '腿'],
    equipment: ['罗马椅'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },

  {
    id: 'smith-bench-press',
    name: '史密斯卧推',
    aliases: ['史密斯机卧推'],
    primaryMuscle: '胸',
    secondaryMuscles: ['肱三头肌', '前束三角肌'],
    equipment: ['史密斯机'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'smith-incline-press',
    name: '史密斯上斜卧推',
    aliases: [],
    primaryMuscle: '胸',
    secondaryMuscles: ['前束三角肌', '肱三头肌'],
    equipment: ['史密斯机'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'arsenal-incline-press',
    name: '阿森纳上斜卧推',
    aliases: [],
    primaryMuscle: '胸',
    secondaryMuscles: ['前束三角肌', '肱三头肌'],
    equipment: ['器械'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'incline-dumbbell-press',
    name: '哑铃上斜卧推',
    aliases: ['上斜哑铃卧推'],
    primaryMuscle: '胸',
    secondaryMuscles: ['前束三角肌', '肱三头肌'],
    equipment: ['哑铃', '卧推凳'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'nautilus-flat-press',
    name: 'Nautilus平推',
    aliases: [],
    primaryMuscle: '胸',
    secondaryMuscles: ['肱三头肌', '前束三角肌'],
    equipment: ['器械'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'independent-decline-press',
    name: '分动下斜推胸',
    aliases: [],
    primaryMuscle: '胸',
    secondaryMuscles: ['肱三头肌'],
    equipment: ['器械'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'cable-fly',
    name: '绳索夹胸',
    aliases: [],
    primaryMuscle: '胸',
    secondaryMuscles: ['前束三角肌'],
    equipment: ['龙门架'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'dip',
    name: '双杠臂屈伸',
    aliases: [],
    primaryMuscle: '胸',
    secondaryMuscles: ['肱三头肌', '前束三角肌'],
    equipment: ['双杠'],
    category: '力量',
    difficulty: '进阶',
    metrics: '次',
    video: ''
  },
  {
    id: 'machine-chest-extension',
    name: '固定器械臂屈伸',
    aliases: [],
    primaryMuscle: '胸',
    secondaryMuscles: [],
    equipment: [],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'pec-deck',
    name: '蝴蝶机夹胸',
    aliases: ['蝴蝶机'],
    primaryMuscle: '胸',
    secondaryMuscles: ['前束三角肌'],
    equipment: ['蝴蝶机'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },

  {
    id: 'y-raise',
    name: 'Y字侧平举',
    aliases: [],
    primaryMuscle: '肩',
    secondaryMuscles: ['斜方肌'],
    equipment: ['哑铃'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'machine-shoulder-press',
    name: '器械推肩',
    aliases: [],
    primaryMuscle: '肩',
    secondaryMuscles: ['肱三头肌'],
    equipment: ['器械'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'smith-shoulder-press',
    name: '史密斯推肩',
    aliases: [],
    primaryMuscle: '肩',
    secondaryMuscles: ['肱三头肌'],
    equipment: ['史密斯机'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'bent-over-dumbbell-pull',
    name: '俯身哑铃提拉',
    aliases: [],
    primaryMuscle: '肩',
    secondaryMuscles: ['斜方肌'],
    equipment: ['哑铃'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'face-pull',
    name: '面拉',
    aliases: ['Face Pull'],
    primaryMuscle: '肩',
    secondaryMuscles: ['斜方肌'],
    equipment: ['龙门架'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'cable-lateral-raise',
    name: '绳索侧平举',
    aliases: [],
    primaryMuscle: '肩',
    secondaryMuscles: ['斜方肌'],
    equipment: ['龙门架'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'reverse-pec-deck',
    name: '蝴蝶机后束外展',
    aliases: [],
    primaryMuscle: '肩',
    secondaryMuscles: ['斜方肌'],
    equipment: ['蝴蝶机'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },

  {
    id: 'machine-crunch',
    name: '器械卷腹',
    aliases: [],
    primaryMuscle: '核心',
    secondaryMuscles: [],
    equipment: ['器械'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'hanging-leg-raise',
    name: '悬垂举腿',
    aliases: [],
    primaryMuscle: '核心',
    secondaryMuscles: ['髋屈肌'],
    equipment: ['单杠'],
    category: '力量',
    difficulty: '进阶',
    metrics: '次',
    video: ''
  },
  {
    id: 'precor-leg-raise',
    name: 'Precor举腿',
    aliases: [],
    primaryMuscle: '核心',
    secondaryMuscles: [],
    equipment: ['器械'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'triceps-lateral-cable-pushdown',
    name: '外侧头绳索下拉',
    aliases: [],
    primaryMuscle: '手臂',
    secondaryMuscles: ['肱三头肌'],
    equipment: ['龙门架'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'triceps-long-head-cable-pushdown',
    name: '长头绳索下拉',
    aliases: [],
    primaryMuscle: '手臂',
    secondaryMuscles: ['肱三头肌'],
    equipment: ['龙门架'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'single-arm-cable-pushdown',
    name: '单臂绳索下拉',
    aliases: [],
    primaryMuscle: '手臂',
    secondaryMuscles: ['肱三头肌'],
    equipment: ['龙门架'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'barbell-curl',
    name: '杠铃二头弯举',
    aliases: [],
    primaryMuscle: '手臂',
    secondaryMuscles: ['肱二头肌'],
    equipment: ['杠铃'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'cable-curl',
    name: '绳索二头弯举',
    aliases: [],
    primaryMuscle: '手臂',
    secondaryMuscles: ['肱二头肌'],
    equipment: ['龙门架'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'hammer-curl',
    name: '锤式弯举',
    aliases: [],
    primaryMuscle: '手臂',
    secondaryMuscles: ['肱二头肌'],
    equipment: ['哑铃'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  },
  {
    id: 'overhead-cable-triceps-extension',
    name: '颈后绳索下拉',
    aliases: [],
    primaryMuscle: '手臂',
    secondaryMuscles: ['肱三头肌'],
    equipment: ['龙门架'],
    category: '力量',
    difficulty: '入门',
    metrics: '次',
    video: ''
  }
];
