require('dotenv').config();
const { sequelize } = require('./src/config/db');
const { AIQuiz, AIQuestion } = require('./src/models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected\n');

    // 1. Find PUBLISHED quizzes with 0 questions → set them back to DRAFT
    //    (Participants can't take them anyway — our 422 guard now blocks it —
    //     but the trainer needs to see them so they can regenerate or delete)
    const publishedEmpty = await AIQuiz.findAll({
      where: { status: 'PUBLISHED' },
      include: [{ model: AIQuestion, as: 'questions' }]
    });

    var demoted = 0;
    for (var i = 0; i < publishedEmpty.length; i++) {
      var q = publishedEmpty[i];
      if (q.questions.length === 0) {
        await q.update({ status: 'DRAFT' });
        console.log('[FIX] Demoted PUBLISHED→DRAFT Quiz #' + q.id + ' "' + q.title + '" (had 0 questions)');
        demoted++;
      }
    }

    if (demoted === 0) {
      console.log('[OK] No published quizzes with 0 questions found.');
    } else {
      console.log('\n[DONE] Demoted ' + demoted + ' empty published quiz(zes) to DRAFT.');
    }

    // 2. Report final clean state
    console.log('\n=== Final Published Quizzes ===');
    var finalPublished = await AIQuiz.findAll({
      where: { status: 'PUBLISHED' },
      include: [{ model: AIQuestion, as: 'questions' }]
    });

    if (finalPublished.length === 0) {
      console.log('  No PUBLISHED quizzes yet. Trainers need to publish their quizzes.');
    } else {
      finalPublished.forEach(function(q) {
        var tid = q.trainingId !== null ? q.trainingId : 'NULL(visible to all)';
        console.log(
          '  [PUBLISHED] Quiz #' + q.id +
          ' | trainingId=' + tid +
          ' | questions=' + q.questions.length +
          ' | "' + q.title + '"'
        );
      });
    }

    // 3. Also show quizzes with questions that are still DRAFT (trainer should publish these)
    console.log('\n=== DRAFT Quizzes WITH Questions (ready to publish) ===');
    var readyDrafts = await AIQuiz.findAll({
      where: { status: 'DRAFT' },
      include: [{ model: AIQuestion, as: 'questions' }]
    });
    var nonEmpty = readyDrafts.filter(function(q) { return q.questions.length > 0; });
    if (nonEmpty.length === 0) {
      console.log('  (none)');
    } else {
      nonEmpty.forEach(function(q) {
        console.log(
          '  [DRAFT] Quiz #' + q.id +
          ' | questions=' + q.questions.length +
          ' | "' + q.title + '" → trainer can publish this'
        );
      });
    }

    await sequelize.close();
    console.log('\nCleanup complete.');
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
