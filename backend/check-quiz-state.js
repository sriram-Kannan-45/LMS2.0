require('dotenv').config();
const { sequelize } = require('./src/config/db');
const { AIQuiz, AIQuestion } = require('./src/models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected OK\n');

    const quizzes = await AIQuiz.findAll({
      include: [{ model: AIQuestion, as: 'questions' }],
      order: [['created_at', 'DESC']]
    });

    console.log('=== All Quizzes in DB ===');
    if (quizzes.length === 0) {
      console.log('  (none found)');
    } else {
      quizzes.forEach(function(q) {
        var tid = q.trainingId !== null ? q.trainingId : 'NULL';
        console.log(
          '  Quiz #' + q.id +
          ' | status=' + q.status +
          ' | trainingId=' + tid +
          ' | questions=' + q.questions.length +
          ' | title="' + q.title + '"'
        );
      });
    }

    var total = quizzes.reduce(function(s, q) { return s + q.questions.length; }, 0);
    console.log('\nTotal: ' + quizzes.length + ' quizzes, ' + total + ' questions total');

    var published = quizzes.filter(function(q) { return q.status === 'PUBLISHED'; });
    console.log('Published quizzes: ' + published.length);

    var withQs = published.filter(function(q) { return q.questions.length > 0; });
    console.log('Published quizzes WITH questions: ' + withQs.length);

    var drafts = quizzes.filter(function(q) { return q.status === 'DRAFT'; });
    console.log('Draft quizzes: ' + drafts.length);
    drafts.forEach(function(q) {
      console.log('  -> DRAFT Quiz #' + q.id + ' "' + q.title + '" has ' + q.questions.length + ' questions (needs publishing)');
    });

    await sequelize.close();
    console.log('\nDone.');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
