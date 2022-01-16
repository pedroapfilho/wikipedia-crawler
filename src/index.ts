import puppeteer from "puppeteer";
import { writeFile } from "fs";

const SOURCE = "https://wikipedia.org/wiki/ISO_3166-2:US";

type State = {
  name: string;
  code: string;
  category: string;
};

const generate = async (): Promise<void> => {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();
  await page.goto(SOURCE);

  const generatedStates: State[] = await page.evaluate(() => {
    const rowsSelector =
      "#mw-content-text > div.mw-parser-output > table:nth-child(13) > tbody > tr";

    const rows = document.querySelectorAll(rowsSelector);

    const data = Array.from(rows, (row) => {
      const columnsSelector = "td";

      const columns = row.querySelectorAll(columnsSelector);

      return Array.from(columns, (column) =>
        column.innerText.replace(/ *\[[^\]]*]/, "")
      );
    });

    if (data.length === 0) {
      return [];
    }

    return data.map((state) => ({
      code: state[0].split("-")[1],
      name: state[1],
      category: state[2],
    }));
  });

  const states = generatedStates
    .filter((state) => state.name)
    .map((state) => ({ ...state, name: state.name.trim() }));

  await browser.close();

  await writeFile("./data.json", JSON.stringify(states, null, 4), (err) => {
    if (err) throw err;
  });
};

let attempts = 3;

const run = async (): Promise<void> => {
  if (attempts === 0) {
    return;
  }

  try {
    await generate();
  } catch (err) {
    console.log(err);

    attempts -= 1;

    run();
  }
};

run();
