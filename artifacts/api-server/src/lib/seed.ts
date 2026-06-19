import { db } from "@workspace/db";
import {
  topicsTable,
  lecturesTable,
  assignmentsTable,
  problemsTable,
  seedMetaTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";

// Content version of the seeded curriculum. BUMP THIS whenever the TOPICS or
// ASSIGNMENTS content below changes. On boot, seedIfEmpty compares this against
// the value stored in seed_meta; a mismatch forces a full re-seed, so content
// edits self-heal in every environment (including a republished production)
// without a manual database wipe.
const SEED_CONTENT_VERSION = "2026-06-19-basic-evo-psych-v2";

type SeedTopic = {
  slug: string;
  title: string;
  weekNumber: number;
  blurb: string;
  lectureTitle: string;
  body: string;
};

const TOPICS: SeedTopic[] = [
  // Unit 1 — Basic Evolutionary Psychology
  {
    slug: "mind-has-history",
    title: "The mind has a history",
    weekNumber: 1,
    blurb: "Your brain is an evolved body part that comes pre-loaded — not a blank page.",
    lectureTitle: "1.1 The mind has a history (your thoughts and feelings are tools, not accidents)",
    body: `# The mind has a history

When you think about where your body came from, the answer is easy: you grew it over years, and before that it was shaped over a very long time by living things slowly changing. Here is the surprising part — **your mind has the same kind of history.** Your brain is a body part, just like your heart or your hands, and it was shaped across countless generations to help your ancestors survive and care for their families.

## The brain is an organ with a job

Your heart has a job: pump blood. Your stomach has a job: digest food. Your **brain** has a job too — to take in what's happening around you and quickly choose what to do. Like every other body part, it was built up slowly over a very long time, because the versions that worked best got passed on. So the brain isn't a blank notebook waiting to be filled in. It arrives already good at certain things.

## Not a blank slate

People used to think a infant's mind was a totally empty page, and that everything we feel and think is just written on later by the world. But that isn't quite right. A newborn already knows how to suck, cry, and grip a finger. A infant will stare longer at a face than at a random pattern. Nobody taught them that. They came **pre-loaded** — born ready for a few important things, the way a new phone comes with a few apps already installed.

## Feelings are tools, not accidents

Here is the big idea of this whole course: your thoughts and feelings aren't random, and they aren't mistakes. They are **tools** that helped your ancestors. Fear makes you freeze or run from danger. Disgust makes you spit out rotten food before it makes you sick. Love makes you take care of the people closest to you. Each feeling is like a tool in a toolbox, shaped because it once helped people stay alive and look after their families.

## Why "shaped over time"?

Long ago, tiny differences between people mattered. Someone who felt afraid of a growling animal was more likely to live than someone who felt nothing. The ones who lived had children, and those children often inherited the same useful feeling through their **genes** — the instructions passed from parent to child. Repeat that for a very, very long time and you get a mind that comes ready with helpful instincts. The mind even seems to have different "parts" for different jobs — a bit for faces, a bit for danger, a bit for language — like separate tools each shaped for one task.

## In the real world

Infants all over the world, in every country, start to fear strangers at about the same age — around eight months old. No parent teaches this; it shows up on its own, right around the time a crawling infant could wander off into danger. That timing is a clue. A feeling that appears on schedule, everywhere, without being taught, looks a lot like something the mind came **pre-loaded** with — a small piece of history you can actually watch happen.`,
  },
  {
    slug: "built-to-survive",
    title: "Built to survive",
    weekNumber: 1,
    blurb: "Why we crave sugar, fear snakes faster than cars, and find certain places beautiful.",
    lectureTitle: "1.2 Built to survive (the easiest proof the past engineered your mind)",
    body: `# Built to survive

The easiest way to see that your mind has a history is to look at the things you want, fear, and find beautiful — without ever deciding to. A lot of those reactions don't fully make sense for the world *today*, but they make perfect sense for the world your ancestors lived in. In many ways, your mind is **built for the past.**

## Why sweet and fatty food tastes amazing

Sugar and fat taste wonderful to almost everyone. That isn't an accident. Long ago, food was often scarce, and sweet, fatty food was packed with the energy a body needed to survive. People who loved that food ate it whenever they found it and were more likely to live through hungry times. Today food is everywhere, so the same craving can lead us to eat too much candy — but the craving itself is an old survival tool that once kept people alive.

## Fearing the right things (and the wrong ones)

People learn to fear snakes and spiders incredibly fast — often after a single scare, or even just a warning. But we *don't* pick up fears of cars, electricity, or junk food nearly as easily, even though those hurt far more people today. Why? Snakes and spiders were dangers for millions of years, so the mind comes ready to fear them quickly. Cars are brand new in the history of humans, so there was never time to build in a fast fear of them. Your fears are tuned to your **ancestors'** dangers, not always your own.

## Why certain places feel beautiful

Picture a calm scene people call "beautiful": open grassy land, a few scattered trees, some water in the distance, maybe a hill to look out from. People across the whole world tend to like that same kind of view — it shows up in paintings, parks, and postcards everywhere. That's the kind of place where early humans could find water, spot food, and watch for danger. A landscape that meant *safety and supplies* long ago still feels pleasant and "right" to us now.

## The mind can be a little out of date

Notice the pattern in all three examples: a reaction that was smart long ago can be a little off today. We crave sugar in a world already full of it. We fear snakes more than cars. We relax at the sight of open grassland even from a city apartment. None of this means your mind is broken — it means it was **tuned for a different world.** Spotting that gap is one of the most useful things this whole field teaches.

## In the real world

Scientists ran a clever test with infants and a glass floor — a clear, strong surface with a deep drop visible underneath, called a "visual cliff." Even crawling infants who had never fallen far would stop at the edge and refuse to crawl over the drop, no matter how much their parents waved them on. Nobody taught them to fear heights. A fall was deadly to our ancestors for millions of years, so the caution comes **built in** — survival wisdom showing up before a infant could ever learn it the hard way.`,
  },
  {
    slug: "logic-of-attraction",
    title: "The logic of attraction",
    weekNumber: 1,
    blurb: "Beauty is really a set of clues — the mind quietly reading signs of health and character.",
    lectureTitle: "1.3 The logic of attraction (why \"beautiful\" is really a bunch of clues)",
    body: `# The logic of attraction

Of all the things an evolved mind does, choosing who to like, trust, and team up with is one of the most powerful — and one of the most interesting. This section is about **attraction**: why people find some others appealing, and why "beauty" turns out to be less about magic and more about clues.

## Beauty is really a bunch of clues

When we call someone "beautiful" or "handsome," our mind is quietly reading **clues** about health. Clear skin, bright eyes, a healthy smile, and plenty of energy all tend to signal that a person is healthy and well. Long ago, choosing a healthy partner meant a better chance of a healthy family. So the things we find attractive are, underneath, signs of health and strength — the mind reading a kind of report card without us realizing it.

## Why faces matter so much

People everywhere pay huge attention to faces, and tend to like faces that are **even and balanced** — where the left side looks much like the right. A balanced face can be a small sign that a body grew up healthy, without too many troubles along the way. We aren't doing this on purpose; the preference just feels automatic — which is exactly what you'd expect from something the mind came ready with.

## It's not only looks

Attraction isn't just about appearance. People across the world also rate **kindness, fairness, and being a good helper** as some of the most attractive things in a friend or partner. That makes sense too: a kind, dependable person is a wonderful teammate for the long job of raising a family and surviving together. So "the logic of attraction" includes character, not just faces — and the character clues often matter most.

## Different clues for different jobs

The mind seems to weigh different clues depending on what it's looking for. For a quick teammate on a class project, we might look for skill and energy. For a lifelong partner, people tend to care more about kindness, loyalty, and steadiness — clues that someone will *stick around and help.* The point is that attraction isn't random; it's the mind sorting people by the clues that mattered for each kind of relationship.

## In the real world

Researchers showed people lots of photos of faces, then quietly blended several real faces together into one "average" face. Again and again, people picked the blended, average face as *more* attractive than the individual ones. It sounds strange, but it fits: an average face is balanced and has none of the unusual features that can hint at illness, so the mind reads it as a healthy, safe choice. People in many different countries show the very same preference — another sign of a clue-reading system we all share.`,
  },
  {
    slug: "love-and-jealousy",
    title: "Love, jealousy, and keeping a mate",
    weekNumber: 1,
    blurb: "Love is the glue that keeps partners together; jealousy is the alarm that protects the bond.",
    lectureTitle: "1.4 Love, jealousy, and keeping a mate (a matched pair of feelings)",
    body: `# Love, jealousy, and keeping a mate

Finding someone is only half the story. The evolved mind also has tools for **bonding** with a partner and for *protecting* that bond. Two of the strongest feelings humans have — love and jealousy — turn out to be a matched pair, built for the same job.

## Love as glue

Raising a human child is a huge, slow job — human infants are helpless for years, far longer than the young of most animals. A child does much better when *two* caring adults stick together to help. **Love** — that strong pull to stay close to one special person — works like glue that keeps partners together through that long job. A feeling that kept caregivers working as a team would have helped their children survive, so the feeling got passed on.

## Jealousy as an alarm

If love is the glue, **jealousy** is the alarm. Jealousy is an uncomfortable feeling that flares up when an important bond seems threatened — when someone you're close to might be pulled away. It's unpleasant on purpose: the bad feeling pushes a person to pay attention and protect the relationship. Like fear, jealousy is a tool — an alarm that says, "something you depend on is at risk."

## Tools can misfire

Here is the tricky part: an alarm that is too sensitive causes problems. A little jealousy can make someone notice and protect a friendship; too much can make them controlling, unfair, or unkind. Understanding that jealousy is an **old alarm system** doesn't make it always right — it helps us notice when the alarm is overreacting, so we can choose to act better than the raw feeling alone would.

## Strategies, not scripts

People don't all bond in exactly the same way, and that's expected. Depending on their situation, people lean toward different **strategies** — some bond fast and deep, some take their time, some stay more independent. None of these is the one true "human program." The mind comes with a range of settings, and life nudges the dial. Evolution gave us flexible tools, not a single fixed script.

## In the real world

Around the world, in cultures that have never met, people tell remarkably similar love stories — songs and tales about two people drawn together, kept apart, and aching to reunite. Anthropologists who studied hundreds of different societies found romantic love in nearly every single one. A feeling that appears in almost every human group, with no one spreading it between them, is strong evidence that it's part of the **shared toolkit** our minds were built with.`,
  },
  {
    slug: "why-we-cooperate",
    title: "Why we cooperate",
    weekNumber: 1,
    blurb: "Sharing, fairness, gratitude, and friendship are some of evolution's smartest survival tools.",
    lectureTitle: "1.5 Why we cooperate (kin, fairness, and the scorecard in your head)",
    body: `# Why we cooperate

If evolution is about surviving and having families, you might expect people to be selfish all the time. But humans are some of the most **cooperative** creatures on Earth — we share, help, take turns, and care deeply about fairness. This isn't a contradiction. Cooperation turns out to be one of the smartest survival tools of all.

## Helping family first

The easiest cooperation to explain is helping **family.** Your relatives share many of the same genes you carry, so helping them survive helps your own "instructions" carry on, even if you never have children yourself. That's why people will sacrifice the most for parents, brothers, sisters, and their own kids. The strong, automatic pull to protect family is one of the clearest tools the evolved mind comes with.

## Taking turns: "I help you, you help me"

We also help people who *aren't* family, through something simple: **taking turns.** If I share my food today and you share yours tomorrow, we both do better than if we each hoarded. This "I help you, you help me" deal works fine as long as people pay each other back. That's also why being helped and *not* returning the favor feels so wrong — our minds keep a quiet scorecard of who's fair and who isn't.

## Why fairness and gratitude feel so strong

Feelings like **gratitude, guilt, and anger** are the tools that keep cooperation running. Gratitude makes you want to repay a kindness. Guilt nudges you to fix things when you've let someone down. Anger flares when someone cheats you, pushing you to stop being taken advantage of. These feelings aren't random moods — they're the mind's way of protecting fair trade between people.

## Friendship and status

Humans also build **friendships** — long-term partners you can count on — and care about **status**, meaning being respected and valued by the group. Both made sense for survival: a person with loyal friends and a good reputation got help in hard times, while someone known as a cheater got left out. Caring what others think of you can be uncomfortable, but it's an old tool for staying part of a group you needed.

## In the real world

Scientists play a sharing game with young children: they give one child some treats and let them choose how many, if any, to give to another child. Long before anyone teaches them about "being fair," children start sharing — and they get visibly upset when *they* are the ones treated unfairly. This sense of fairness shows up early, across very different cultures, which suggests cooperation isn't only taught manners. It's part of the **equipment** humans are born ready to use.`,
  },
  {
    slug: "why-we-fight",
    title: "Why we fight — and believe",
    weekNumber: 1,
    blurb: "The same evolved mind that makes us loyal can make us fight — and it's the source of culture and religion.",
    lectureTitle: "1.6 Why we fight — and believe (us, them, culture, and the open questions)",
    body: `# Why we fight — and believe

The same mind that makes us loving and cooperative can also make us fight. And the same mind builds the giant shared ideas we call culture and religion. This last section ties the whole course together — and leaves you with the biggest questions still open.

## Us and them

Humans are quick to split the world into **"us" and "them."** We bond tightly with our own group and grow wary of outsiders. Long ago, your group was your protection — your family, your team, your safety — and rival groups could be a real danger. So the mind came ready to feel loyalty inside the group and caution toward outsiders. This tool helped people survive, but it's also behind a lot of conflict, from playground teams to wars between nations.

## Status and conflict

Remember status from the last section? The same desire to be respected can also spark **conflict.** People compete for rank, fairness disputes turn into fights, and whole groups clash over land, food, or pride. None of this means fighting is "good" — it means the very drives that help us cooperate inside a group can also pull groups *against* each other. Seeing that clearly is the first step to handling it better.

## Where culture comes from

Now zoom out. Humans are the only animal that builds **culture** — shared stories, rules, tools, songs, and customs passed down and improved over generations. Culture isn't separate from the evolved mind; it's something the evolved mind *produces.* A brain built to learn from others, copy the best ideas, and follow group rules naturally creates culture. Our biggest invention grows straight out of our oldest instincts.

## Even religion?

Many thinkers argue that **religion**, too, grows from features of the evolved mind: our habit of sensing a "who" behind events, our deep need to belong to a group, and our trust in what elders teach us. This is one of the field's boldest and most debated ideas. It does not claim to settle what is true about the universe — it only asks where the *human tendency* to believe might come from.

## The biggest questions stay open

That's the honest place to end. Evolutionary psychology gives us powerful clues about why we crave, fear, love, cooperate, fight, and believe. But it doesn't answer everything — how far we can rise above our instincts, how to build a fair and peaceful world, what our minds might one day become. Those questions are still wide open. Now you have a new way to think about them: by asking, every time, "What might this part of the mind have been *for*?"

## In the real world

When researchers split strangers into groups for an experiment — even using something as silly as a coin flip — people quickly start favoring their own group and competing with the other, though they were total strangers minutes before. In the famous "Robbers Cave" study, two groups of ordinary boys at a summer camp turned into bitter rivals within days, then made peace only when they were given a shared goal they had to work toward together. It shows how fast the "us and them" switch can flip on — and, hopefully, how a bigger shared purpose can switch it back off.`,
  },
];

type SeedAssignment = {
  kind: "homework" | "test" | "midterm" | "final";
  title: string;
  weekNumber: number;
  isTimed: boolean;
  timeLimitMinutes: number | null;
  instructions: string;
  problems: Array<{
    topicSlug: string;
    prompt: string;
    correctAnswer: string;
    explanation: string;
    hint?: string;
  }>;
};

const ASSIGNMENTS: SeedAssignment[] = [
  {
    kind: "homework",
    title: "Homework 1.1 — The evolved mind, survival, and attraction",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Untimed practice covering sections 1.1–1.3. Answer each question in a few sentences (about 3–5) in your own words. There's no need for any math — just explain your thinking clearly. One-word answers won't receive credit.",
    problems: [
      {
        topicSlug: "mind-has-history",
        prompt:
          "Some people say a infant's mind is a totally blank page that the world fills in later. Use one example to explain why evolutionary psychology says the mind comes 'pre-loaded' instead. (3–5 sentences.)",
        correctAnswer:
          "A blank-page view says infants start with nothing and learn everything from scratch, but newborns clearly arrive already able to do important things. For example, a newborn knows how to suck and grip a finger, and infants will stare longer at a face than at a random pattern even though no one taught them to. Those abilities show up too early and too reliably to have been learned. So the mind comes 'pre-loaded' — born ready for a few important things — the way a new phone arrives with some apps already installed.",
        explanation:
          "Full credit: contrasts the blank-slate view with the pre-loaded view and gives a concrete inborn ability (e.g. grasping, face preference, fearing strangers) that appears without being taught.",
      },
      {
        topicSlug: "mind-has-history",
        prompt:
          "Pick a feeling like fear, disgust, or love and explain what 'job' it might have done for our ancestors. Then explain what it means to call a feeling a 'tool' rather than an accident. (3–5 sentences.)",
        correctAnswer:
          "Take disgust: it makes us wrinkle our nose and spit out rotten or spoiled food. For our ancestors, that reaction helped them avoid eating things that could make them sick, which helped them survive. Calling disgust a 'tool' means it isn't a random or pointless reaction — it does a useful job, the way a tool in a toolbox is shaped for a task. It got passed down through the generations precisely because it kept people alive, not by accident.",
        explanation:
          "Full credit: ties a specific feeling to an ancestral survival job and explains that 'tool' means the feeling serves a purpose (and was passed on for it), not that it is random.",
      },
      {
        topicSlug: "built-to-survive",
        prompt:
          "People learn to fear snakes far faster than they learn to fear cars, even though cars hurt many more people today. Explain why an evolved mind would be 'tuned' this way. (3–5 sentences.)",
        correctAnswer:
          "Snakes were a real danger to humans and their ancestors for millions of years, so minds that quickly learned to fear them survived better and passed that readiness on. Cars, by contrast, have only existed for about a hundred years — far too short a time for a fast, built-in fear of them to develop. So our fears are tuned to the dangers of the *ancestral* world, not always the dangers of today. That's why a quick, easy fear of snakes feels natural while fearing a car takes real effort.",
        explanation:
          "Full credit: explains snakes were ancient threats (so readiness to fear them was selected for) while cars are too recent for a built-in fear, and connects this to fears being tuned to ancestral dangers.",
        hint: "Think about how LONG snakes have been a danger to humans compared to how long cars have existed.",
      },
      {
        topicSlug: "logic-of-attraction",
        prompt:
          "Evolutionary psychology says 'beauty is really a bunch of clues.' Explain what that means using one example, and why the mind would read such clues automatically. (3–5 sentences.)",
        correctAnswer:
          "It means that when we find someone attractive, our mind is quietly reading signs of health rather than responding to magic. For example, clear skin, bright eyes, and a balanced face can all hint that a person grew up healthy and well. Long ago, choosing a healthy partner meant a better chance of a healthy family, so people who paid attention to those clues tended to have more children who survived. That's why the reading feels automatic — it's an inherited habit of noticing health, not a choice we make on purpose.",
        explanation:
          "Full credit: explains attraction as the mind reading health clues, gives a concrete clue (skin, eyes, facial balance, energy), and ties the automatic preference to better ancestral outcomes.",
      },
    ],
  },
  {
    kind: "homework",
    title: "Homework 1.2 — Love, cooperation, and conflict",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions:
      "Untimed practice covering sections 1.4–1.6. Answer each question in a few sentences (about 3–5) in your own words. Explain your reasoning. One-word answers won't receive credit.",
    problems: [
      {
        topicSlug: "love-and-jealousy",
        prompt:
          "The lecture calls love 'glue' and jealousy 'an alarm.' Explain how these two feelings work together to do one job. (3–5 sentences.)",
        correctAnswer:
          "Love acts like glue because it pulls two people to stay close and keep helping each other through the long, hard job of raising a child. Jealousy acts like an alarm because it flares up, uncomfortably, when that important bond seems threatened — pushing the person to notice and protect the relationship. Together they do one job: forming a partnership and then guarding it. One builds the bond and the other defends it, which is why they're described as a matched pair.",
        explanation:
          "Full credit: explains love as the bonding/keeping-together feeling and jealousy as the protective alarm, and ties both to the shared job of forming and defending a partnership.",
      },
      {
        topicSlug: "why-we-cooperate",
        prompt:
          "Why would an evolved, 'survival of the fittest' mind make people willing to share food with relatives? Explain the idea of helping family. (3–5 sentences.)",
        correctAnswer:
          "Relatives share many of the same genes you carry, so helping a relative survive also helps copies of your own 'instructions' continue, even if you never have children yourself. That means sharing food with family isn't really the opposite of survival — it's another way the same inherited information gets carried forward. This is why people will sacrifice the most for parents, siblings, and their own kids. A strong, automatic urge to protect family is exactly the tool an evolved mind would come with.",
        explanation:
          "Full credit: explains kin sharing genes, so helping family carries one's own genes forward, making family-helping consistent with (not against) evolution.",
        hint: "Think about what your relatives share with you that gets passed down through generations.",
      },
      {
        topicSlug: "why-we-cooperate",
        prompt:
          "A friend borrows your snack every day but never shares anything back. Explain why this feels unfair, and what feelings like gratitude and anger are 'for' in cooperation. (3–5 sentences.)",
        correctAnswer:
          "Cooperation between non-family works through taking turns — 'I help you, you help me' — and our minds keep a quiet scorecard of who pays back. A friend who always takes and never gives breaks that deal, so it feels unfair because the scorecard is one-sided. Feelings are the tools that protect the deal: gratitude makes us want to repay a kindness, while anger flares at someone who cheats, pushing us to stop being taken advantage of. So those feelings aren't random moods — they keep trading between people fair.",
        explanation:
          "Full credit: identifies reciprocity/taking turns and the mental scorecard, and explains gratitude (repay kindness) and anger (punish/stop cheating) as tools that keep cooperation fair.",
      },
      {
        topicSlug: "why-we-fight",
        prompt:
          "In the 'Robbers Cave' study, ordinary boys split into two camp groups quickly became rivals. Explain what this shows about the 'us and them' part of the mind, and what finally reduced the conflict. (3–5 sentences.)",
        correctAnswer:
          "It shows how fast the mind's 'us and them' switch can flip on: total strangers, sorted into groups, quickly grew loyal to their own side and hostile to the other within just days. That fits the idea that we came ready to bond tightly inside a group and feel wary of outsiders, because long ago your group was your protection. The conflict finally eased when the two groups were given a shared goal they had to work toward together. A bigger, common purpose effectively switched the 'us and them' line to include everyone.",
        explanation:
          "Full credit: explains the rapid in-group/out-group split as evidence of an evolved 'us and them' tendency, and notes that a shared/superordinate goal reduced the conflict.",
      },
    ],
  },
  {
    kind: "test",
    title: "Unit Test — Basic Evolutionary Psychology",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 30,
    instructions:
      "Timed. 30 minutes. Covers sections 1.1–1.6. Answer each question in a few sentences (about 4–6) in your own words. Pasting is disabled; keystrokes are screened for AI use.",
    problems: [
      {
        topicSlug: "mind-has-history",
        prompt:
          "Explain what it means to say 'the mind has a history,' and why this view treats the brain like any other body part. Use one original example of an inborn reaction. (4–6 sentences.)",
        correctAnswer:
          "Saying 'the mind has a history' means the brain was shaped over a very long time, across many generations, to help our ancestors survive and raise families — not built fresh in each person from a blank start. It treats the brain like any other body part because, just like the heart pumps blood or the stomach digests food, the brain has a job (deciding what to do) and was shaped by the same slow process that shaped the rest of the body. The versions that worked best got passed down through genes, so the mind arrives already good at certain things. For example, a newborn will grip tightly onto a finger placed in its palm without anyone teaching it — a reflex that helped infants hold on to a caregiver. That kind of reaction shows up too early and too reliably to be learned, which is exactly what an evolved, pre-loaded mind would look like.",
        explanation:
          "Full credit: defines 'the mind has a history' as the brain being shaped over generations to solve ancestral problems, compares the brain to other purpose-built organs, and gives an original inborn reaction that appears without teaching.",
      },
      {
        topicSlug: "built-to-survive",
        prompt:
          "Our cravings and fears are described as sometimes being 'out of date.' Explain what that means, using two different examples, and why it doesn't mean the mind is broken. (4–6 sentences.)",
        correctAnswer:
          "'Out of date' means a reaction that was smart in the ancestral world can be a little unhelpful in today's world. One example is craving sugar and fat: that craving kept ancestors alive when food was scarce, but in a world full of candy it can push us to eat too much. A second example is fear: we learn to fear snakes very quickly but barely fear cars, even though cars are far more dangerous now, because snakes were a threat for millions of years and cars are brand new. It doesn't mean the mind is broken — it means the mind was tuned for a different world than the one we live in. The tools still work as designed; the world around them simply changed faster than they could.",
        explanation:
          "Full credit: explains the mismatch between ancestral tuning and the modern world with two valid examples (e.g. sugar cravings, snake vs. car fear, landscape preference) and notes the mind is mistuned, not defective.",
      },
      {
        topicSlug: "logic-of-attraction",
        prompt:
          "Explain why evolutionary psychology says attraction is about 'reading clues,' and why people also rate kindness and loyalty as attractive, not just looks. (4–6 sentences.)",
        correctAnswer:
          "Attraction is described as 'reading clues' because the things we find appealing tend to be signs of something useful underneath. Physical clues like clear skin, bright eyes, and a balanced face hint that a person is healthy, and long ago choosing a healthy partner meant a better chance of a healthy family. But raising a family is a long job that needs a dependable teammate, so people across the world also rate kindness, fairness, and loyalty as highly attractive. Those traits are clues too — clues that someone will stick around and help rather than just look good. So attraction sorts people by the clues that mattered for each kind of relationship, which is why character can matter as much as appearance.",
        explanation:
          "Full credit: explains attraction as the mind reading health/quality clues, gives physical clue examples, and explains kindness/loyalty as clues to a dependable long-term partner.",
      },
      {
        topicSlug: "love-and-jealousy",
        prompt:
          "Jealousy is called a 'tool' that can also 'misfire.' Explain both ideas and why understanding jealousy this way could help someone act better. (4–6 sentences.)",
        correctAnswer:
          "Jealousy is called a tool because it works like an alarm: it flares up uncomfortably when an important bond seems threatened, pushing a person to pay attention and protect the relationship. That alarm once helped keep partnerships together, which mattered for raising children, so it got passed on. But like any alarm, it can misfire — if it is too sensitive, a person may become controlling, suspicious, or unfair even when nothing is really wrong. Understanding jealousy as an old, sometimes-overreacting alarm helps someone pause and ask whether the feeling is matching reality. That gap between noticing the feeling and acting on it is where a person can choose to behave better than the raw alarm alone would.",
        explanation:
          "Full credit: explains jealousy as a protective alarm (a tool) that evolved to guard bonds, that an oversensitive alarm causes harm (misfire), and that recognizing this allows more deliberate, better behavior.",
      },
      {
        topicSlug: "why-we-cooperate",
        prompt:
          "Humans are very cooperative even though evolution is often summed up as 'survival of the fittest.' Explain two different reasons an evolved mind would make people cooperate. (4–6 sentences.)",
        correctAnswer:
          "Cooperation isn't really the opposite of survival — it's one of the smartest survival tools, and there are at least two reasons it evolved. The first is helping family: relatives share many of your genes, so helping them survive helps copies of your own 'instructions' carry on, which is why people sacrifice most for close kin. The second is taking turns with non-family: 'I help you, you help me' leaves both people better off than hoarding, as long as the favor gets returned. Our minds keep a quiet scorecard of who's fair, and feelings like gratitude, guilt, and anger keep that trading honest. So an evolved mind cooperates both to protect its own genes in relatives and to gain from fair, repeated exchanges with others.",
        explanation:
          "Full credit: gives two distinct mechanisms — kin selection (helping relatives who share genes) and reciprocity (taking turns, enforced by emotions/reputation) — and explains why each pays off.",
      },
      {
        topicSlug: "why-we-fight",
        prompt:
          "The lecture says the same evolved mind that makes us cooperate can also make us fight, and that it produces culture. Explain how 'us and them' thinking leads to conflict, and what it means to say culture is a 'product' of the evolved mind. (4–6 sentences.)",
        correctAnswer:
          "Humans came ready to split the world into 'us' and 'them' — bonding tightly with their own group and feeling wary of outsiders — because long ago your group was your protection and rival groups could be dangerous. That same readiness, useful inside a group, turns into conflict when groups compete over status, fairness, land, or pride, pushing them against each other. Saying culture is a 'product' of the evolved mind means culture isn't separate from biology: a brain built to learn from others, copy the best ideas, and follow group rules naturally creates shared stories, customs, and tools. So our greatest invention grows directly out of our oldest instincts. The same equipment, in other words, can build both our togetherness and our conflicts.",
        explanation:
          "Full credit: explains in-group/out-group loyalty as evolved protection that fuels between-group conflict, and explains culture as something the evolved (social, imitative, rule-following) mind produces rather than something separate from it.",
      },
    ],
  },
  {
    kind: "final",
    title: "Final — Basic Evolutionary Psychology",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 45,
    instructions:
      "Timed cumulative final. 45 minutes. Covers the whole course (sections 1.1–1.6). Answer each question in a paragraph (about 5–7 sentences) in your own words. Pasting is disabled; keystrokes are screened for AI use.",
    problems: [
      {
        topicSlug: "why-we-fight",
        prompt:
          "Using ideas from across the whole course, argue that one single idea — that the mind was shaped to solve ancestral problems — can explain things as different as craving sugar, falling in love, sharing with family, and forming rival groups. Use at least three of those examples. (5–7 sentences.)",
        correctAnswer:
          "The one idea tying the course together is that the mind is an evolved organ shaped over a very long time to solve the problems our ancestors faced, so each part of it once did a useful job. Craving sugar and fat made sense when food was scarce, because that energy helped people survive hungry times. Falling in love made sense because the strong pull to stay with one partner kept two caregivers together through the long, hard job of raising a helpless child. Sharing with family made sense because relatives carry copies of your own genes, so helping them helps those instructions carry on. Even forming rival groups fits: bonding with 'us' and guarding against 'them' protected people when their group was their safety. None of these look related on the surface, but each is the same move — a tool built because it solved an ancestral problem. That shared logic is what makes evolutionary psychology so powerful.",
        explanation:
          "Full credit: states the unifying principle (mind shaped to solve ancestral problems) and applies it to at least three distinct examples, showing each behavior once served survival or reproduction.",
      },
      {
        topicSlug: "mind-has-history",
        prompt:
          "Some people insist that everything about how we think and feel is learned from the world around us — a totally blank slate. Using evidence from the course, argue why the mind is better described as 'pre-loaded.' Use one concrete example. (5–7 sentences.)",
        correctAnswer:
          "A pure blank-slate view says we start with nothing and learn everything, but a lot of human reactions appear too early, too reliably, and too universally to have simply been taught. Infants arrive already able to suck, grip a finger, and prefer looking at faces over random patterns, none of which anyone trains them to do. Across the whole world, infants begin to fear strangers around eight months old — right when a crawling infant could wander into danger — without any lesson. In the 'visual cliff' experiment, even crawling infants who had never been hurt refused to cross over a visible drop, showing a caution that was clearly not learned the hard way. These reactions show up on a schedule, everywhere, which is exactly what you'd expect if the mind comes 'pre-loaded' like a phone with a few apps already installed. So the world certainly shapes us, but it writes onto a mind that already arrives prepared.",
        explanation:
          "Full credit: argues against the blank slate using inborn, early-appearing, cross-cultural evidence (e.g. visual cliff, stranger fear, face preference) and concludes the mind comes prepared, not empty.",
      },
      {
        topicSlug: "logic-of-attraction",
        prompt:
          "Explain why finding someone 'beautiful' can be described as the mind reading clues it isn't even aware of, and why this clue-reading would have helped our ancestors. Then explain why people in very different countries often agree about what looks attractive. (5–7 sentences.)",
        correctAnswer:
          "When we find someone beautiful, our mind is quietly noticing signals of health rather than reacting to anything magical, and it does this automatically without our deciding to. Clear skin, bright eyes, energy, and a balanced face are all small clues that a person grew up healthy and well. This clue-reading would have helped our ancestors because choosing a healthy partner meant a better chance of healthy children who survived, so people who paid attention to those signs tended to leave more descendants. Over many generations, that inherited habit of noticing health clues became part of the mind. Because all humans share the same evolved equipment, people in very different countries tend to agree about many of the same clues — for instance, preferring balanced, 'average' faces, which research finds across cultures. That shared agreement, among groups that never taught it to each other, is a strong sign the preference is built in rather than just a local fashion.",
        explanation:
          "Full credit: explains attraction as automatic reading of health clues, ties it to better ancestral reproduction, and uses cross-cultural agreement (e.g. averaged/symmetrical faces) as evidence the preference is evolved, not merely learned.",
      },
      {
        topicSlug: "why-we-cooperate",
        prompt:
          "Pick a real everyday situation where you would help someone, and use it to show how 'helping family' and 'taking turns' are two different reasons an evolved mind cooperates. Then explain why feelings like gratitude or anger are part of how cooperation works. (5–7 sentences.)",
        correctAnswer:
          "Imagine I share my lunch — in one case with my little brother, in another with a classmate. Helping my brother fits the 'helping family' reason: he shares many of my genes, so helping him survive helps copies of my own instructions carry on, even though I get nothing back directly. Helping my classmate fits the 'taking turns' reason: I share today expecting that they'll share with me another day, so we both end up better off than if we each kept everything. These are genuinely different reasons — one is about shared genes, the other about fair exchange between non-relatives. Feelings keep the second kind honest: gratitude makes my classmate want to repay the favor, while anger would flare in me if they always took and never gave back, pushing me to stop being used. So gratitude and anger aren't random moods — they are the tools that protect fair trade and keep cooperation from being exploited.",
        explanation:
          "Full credit: distinguishes kin selection (helping relatives who share genes) from reciprocity (fair exchange with non-kin) in a concrete example, and explains gratitude/anger as emotions that enforce fair reciprocal cooperation.",
      },
    ],
  },
];

export async function seedIfEmpty(): Promise<void> {
  // The course was migrated to the Basic Evolutionary Psychology
  // syllabus. Detect the marker topic; if present and the content version
  // matches, the content is current and we skip. This makes the seed
  // self-healing across environments: a database that still holds older content
  // (e.g. a previous curriculum) is detected and replaced on boot.
  const markerTopic = await db
    .select({ id: topicsTable.id })
    .from(topicsTable)
    .where(eq(topicsTable.slug, "mind-has-history"));
  // Read the stored content version. Tolerate the seed_meta table not yet
  // existing (e.g. a boot that races ahead of schema migration): treat that as
  // "no version recorded", which forces a reseed once the table is present.
  let currentVersion: string | null = null;
  try {
    const storedVersion = await db
      .select({ value: seedMetaTable.value })
      .from(seedMetaTable)
      .where(eq(seedMetaTable.key, "content_version"));
    currentVersion = storedVersion[0]?.value ?? null;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Seed: seed_meta unavailable, treating version as unset");
    currentVersion = null;
  }
  if (markerTopic.length > 0 && currentVersion === SEED_CONTENT_VERSION) {
    logger.info("Seed: course content present and current, skipping");
    return;
  }
  if (markerTopic.length > 0) {
    logger.warn(
      { storedVersion: currentVersion, expected: SEED_CONTENT_VERSION },
      "Seed: course content present but out of date — re-seeding with the current curriculum",
    );
  }

  // No current content. Either the database is empty (fresh) or it still holds
  // an older curriculum. Do the (optional) wipe and the full reseed in a SINGLE
  // transaction so the marker topic only ever becomes visible once the entire
  // curriculum has committed. A crash mid-seed rolls back, so the next boot
  // retries instead of leaving partial content that the marker check would
  // wrongly treat as healthy. TRUNCATE also takes an ACCESS EXCLUSIVE lock, so
  // concurrent readers never observe a half-empty course during the replace
  // window. The diagnostic tables are truncated here too so the (non
  // version-gated) diagnostic seed repopulates them with the current content on
  // the same boot.
  await db.transaction(async (tx) => {
    const existing = await tx.execute(sql`select count(*)::int as n from topics`);
    const row = (existing.rows[0] ?? {}) as { n?: number };
    if ((row.n ?? 0) > 0) {
      logger.warn(
        "Seed: stale course content detected — replacing with the Basic Evolutionary Psychology curriculum",
      );
      await tx.execute(
        sql`TRUNCATE TABLE answers, attempts, practice_attempts, practice_problems, practice_sessions, problems, assignments, lectures, topics, diagnostic_responses, diagnostic_attempts, diagnostic_items, diagnostic_assessments RESTART IDENTITY CASCADE`,
      );
    } else {
      logger.info("Seed: populating course content");
    }

    // Topics + lectures
    const slugToTopicId = new Map<string, number>();
    for (let i = 0; i < TOPICS.length; i++) {
      const t = TOPICS[i]!;
      const [inserted] = await tx
        .insert(topicsTable)
        .values({
          slug: t.slug,
          title: t.title,
          weekNumber: t.weekNumber,
          blurb: t.blurb,
          position: i,
        })
        .returning();
      if (!inserted) throw new Error(`Failed to insert topic ${t.slug}`);
      slugToTopicId.set(t.slug, inserted.id);
      await tx.insert(lecturesTable).values({
        topicId: inserted.id,
        weekNumber: t.weekNumber,
        title: t.lectureTitle,
        body: t.body,
      });
    }

    // Assignments + problems
    for (let i = 0; i < ASSIGNMENTS.length; i++) {
      const a = ASSIGNMENTS[i]!;
      const [inserted] = await tx
        .insert(assignmentsTable)
        .values({
          kind: a.kind,
          title: a.title,
          weekNumber: a.weekNumber,
          position: i,
          isTimed: a.isTimed,
          timeLimitMinutes: a.timeLimitMinutes,
          instructions: a.instructions,
        })
        .returning();
      if (!inserted) throw new Error(`Failed to insert assignment ${a.title}`);
      for (let p = 0; p < a.problems.length; p++) {
        const prob = a.problems[p]!;
        const topicId = slugToTopicId.get(prob.topicSlug);
        if (!topicId) throw new Error(`Unknown topic slug ${prob.topicSlug}`);
        await tx.insert(problemsTable).values({
          assignmentId: inserted.id,
          topicId,
          position: p,
          prompt: prob.prompt,
          correctAnswer: prob.correctAnswer,
          explanation: prob.explanation,
          hint: prob.hint ?? null,
        });
      }
    }

    // Stamp the content version last, inside the same transaction, so the
    // marker check on the next boot only treats the course as "current" once
    // the entire curriculum has committed.
    await tx
      .insert(seedMetaTable)
      .values({ key: "content_version", value: SEED_CONTENT_VERSION })
      .onConflictDoUpdate({
        target: seedMetaTable.key,
        set: { value: SEED_CONTENT_VERSION, updatedAt: new Date() },
      });
  });

  logger.info(
    { topics: TOPICS.length, assignments: ASSIGNMENTS.length, version: SEED_CONTENT_VERSION },
    "Seed complete",
  );
}
