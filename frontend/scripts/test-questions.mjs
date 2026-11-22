import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  loadQuestions,
  getFormQuestions,
  addQuestion,
  removeQuestion,
} from "../src/pages/Questions/Questions.controller.js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const options = { auth: { persistSession: false } };

const ownerA = createClient(url, key, options);
const ownerB = createClient(url, key, options);
const customer = createClient(url, key, options);

let failed = 0;

function check(name, passed) {
  if (passed) {
    console.log("PASS  " + name);
  } else {
    console.log("FAIL  " + name);
    failed = failed + 1;
  }
}

async function errorCode(promise) {
  try {
    await promise;
    return "no error";
  } catch (error) {
    return error.code;
  }
}

async function makeOwner(client, name) {
  const email = "wingman-test-" + name + "-" + Date.now() + "@example.com";
  const signUp = await client.auth.signUp({
    email: email,
    password: "testpass123",
    options: { data: { owner_name: name, restaurant_name: name, language: "en" } },
  });
  if (signUp.error) {
    console.log("Sign up failed: " + signUp.error.message);
    process.exit(1);
  }

  const userId = signUp.data.user.id;
  let result = await client.from("restaurants").select().eq("owner_id", userId).maybeSingle();

  if (!result.data) {
    result = await client
      .from("restaurants")
      .insert({ owner_id: userId, owner_name: name, name: name, slug: name + "-" + Date.now() })
      .select()
      .single();
  }

  await client.from("restaurant_questions").delete().eq("restaurant_id", result.data.id);
  return result.data;
}

const restA = await makeOwner(ownerA, "test-a");
const restB = await makeOwner(ownerB, "test-b");

console.log("\nAdd questions");
const food = await addQuestion(ownerA, restA.id, "How was the food?", "short_answer", "How was the food?", "en");
const parking = await addQuestion(ownerA, restA.id, "Is there parking?", "yes_no", "", "en");
const wait = await addQuestion(ownerA, restA.id, "How was the wait time?", "scale", "How was the wait time?", "en");
check("short answer, yes/no, and 1-5 scale questions added", food && parking && wait);

console.log("\nLoad questions");
const list = await loadQuestions(ownerA, restA.id, "en");
check("questions load in order", list[0].id === food.id && list[1].id === parking.id && list[2].id === wait.id);

const form = await getFormQuestions(customer, restA.id);
check("customer form shows the 3 questions", form.length === 3);

console.log("\nInvalid questions");
check("blank question rejected", (await errorCode(addQuestion(ownerA, restA.id, "   ", "short_answer", "", "en"))) === "blank");
check("question over 200 characters rejected", (await errorCode(addQuestion(ownerA, restA.id, "a".repeat(201), "short_answer", "", "en"))) === "tooLong");
check("duplicate ignoring case rejected", (await errorCode(addQuestion(ownerA, restA.id, "how was the FOOD?", "short_answer", "", "en"))) === "duplicate");

await addQuestion(ownerA, restA.id, "Would you come back?", "yes_no", "", "en");
await addQuestion(ownerA, restA.id, "Favorite dish?", "short_answer", "", "en");
check("sixth question rejected", (await errorCode(addQuestion(ownerA, restA.id, "One more?", "short_answer", "", "en"))) === "limit");

console.log("\nRemove questions");
const feedbackId = randomUUID();
await customer.from("feedback").insert({ id: feedbackId, restaurant_id: restA.id, rating: 5 });
await customer.from("responses").insert({ feedback_id: feedbackId, question_id: food.id, native_text: "Delicious" });

await removeQuestion(ownerA, restA.id, food.id);

const formAfter = await getFormQuestions(customer, restA.id);
check("removed question is not on the customer form", formAfter.length === 4);

const history = await ownerA.from("responses").select("native_text, questions(text_en)").eq("feedback_id", feedbackId);
check("past answer is kept", history.data[0].native_text === "Delicious");
check("removed question text is kept", history.data[0].questions.text_en === "How was the food?");

console.log("\nOther owners");
check("owner B cannot remove owner A question", (await errorCode(removeQuestion(ownerB, restA.id, wait.id))) === "save");
check("owner B cannot add to owner A form", (await errorCode(addQuestion(ownerB, restA.id, "Hacked?", "short_answer", "", "en"))) === "save");

await ownerA.from("restaurants").delete().eq("id", restA.id);
await ownerB.from("restaurants").delete().eq("id", restB.id);

console.log("\n" + failed + " failed");