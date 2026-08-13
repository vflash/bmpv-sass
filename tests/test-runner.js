const sass = require('sass');
const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const EXPECTED_DIR = path.join(__dirname, 'expected');
const BMPV_PATH = path.join(__dirname, '..', 'bmpv.sass');

// Читаем содержимое bmpv.sass один раз
const bmpvContent = fs.readFileSync(BMPV_PATH, 'utf-8');

function normalizeCss(css) {
  if (!css) return '';
  return css
    .replace(/\s+/g, ' ')
    .replace(/\/\*.*?\*\//g, '')
    .trim();
}

function compileSass(sassContent) {
  try {
    // Добавляем содержимое bmpv.sass напрямую перед fixture
    const fullContent = bmpvContent + '\n\n' + sassContent;

    const result = sass.compileString(fullContent, {
      style: 'expanded',
      syntax: 'indented',
      // Подавляем deprecation warnings
      silenceDeprecations: ['global-builtin', 'import'],
      logger: {
        warn: () => {} // Полностью подавляем warnings
      }
    });

    return { css: result.css, error: null };
  } catch (error) {
    return { css: null, error: error.message };
  }
}

function runTests() {
  const verbose = process.argv.includes('--verbose');
  const files = fs.readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.sass')).sort();

  console.log('🧪 Запуск тестов bmpv-sass\n');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;
  let errors = 0;

  files.forEach(file => {
    const fixturePath = path.join(FIXTURES_DIR, file);
    const expectedPath = path.join(EXPECTED_DIR, file.replace('.sass', '.css'));

    const testName = file.replace('.sass', '');

    try {
      let sassCode = fs.readFileSync(fixturePath, 'utf-8');

      const result = compileSass(sassCode);

      if (result.error) {
        console.log(`❌ ${testName}`);
        console.log(`   Ошибка компиляции: ${result.error}\n`);
        errors++;
        return;
      }

      if (!result.css) {
        console.log(`❌ ${testName}`);
        console.log(`   Компиляция вернула пустой результат\n`);
        errors++;
        return;
      }

      if (fs.existsSync(expectedPath)) {
        const expected = fs.readFileSync(expectedPath, 'utf-8');
        const actualNorm = normalizeCss(result.css);
        const expectedNorm = normalizeCss(expected);

        if (actualNorm === expectedNorm) {
          console.log(`✅ ${testName}`);
          passed++;
        } else {
          console.log(`❌ ${testName}`);
          if (verbose) {
            console.log(`   Ожидалось:\n${expected}`);
            console.log(`   Получено:\n${result.css}\n`);
          } else {
            console.log(`   Результат не совпадает с ожидаемым`);
            console.log(`   Используйте --verbose для подробностей\n`);
          }
          failed++;
        }
      } else {
        console.log(`📝 ${testName} (нет expected файла)`);
        if (verbose) {
          console.log(`   Результат:\n${result.css}\n`);
        }
        passed++;
      }

    } catch (error) {
      console.log(`❌ ${testName}`);
      console.log(`   Исключение: ${error.message}`);
      if (verbose) {
        console.log(`   Stack: ${error.stack}\n`);
      }
      errors++;
    }
  });

  console.log('='.repeat(70));
  console.log(`\n📊 Результаты: ${passed} ✅ | ${failed} ❌ | ${errors} ⚠️\n`);

  process.exit(failed > 0 || errors > 0 ? 1 : 0);
}

runTests();