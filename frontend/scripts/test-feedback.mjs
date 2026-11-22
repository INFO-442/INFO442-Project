import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { getFormQuestions } from "../src/pages/Questions/Questions.controller.js";
import { getRestaurantBySlug, submitFeedback } from "../src/pages/Customer/Customer.controller.js";
import { loadFeedback } from "../src/pages/Feedback/Feedback.controller.js";

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
  const signUp = await client.auth.signUp({
    email: "wingman-test-" + name + "-" + Date.now() + "@example.com",
    password: "testpass123",
    options: { data: { owner_name: name, restaurant_name: name, language: "en" } },
  });
  if (signUp.error) {
    console.log("Sign up failed: " + signUp.error.message);
    process.exit(1);
  }

  const result = await client.from("restaurants").select().eq("owner_id", signUp.data.user.id).single();
  return result.data;
}

const restA = await makeOwner(ownerA, "test-a");
const restB = await makeOwner(ownerB, "test-b");

console.log("\nFeedback link");
const found = await getRestaurantBySlug(customer, restA.slug);
check("valid link works without logging in", found.id === restA.id);

const badLink = await errorCode(getRestaurantBySlug(customer, "not-a-real-link"));
check("invalid link is rejected", badLink === "invalidLink");

const questions = await getFormQuestions(customer, restA.id);
const foodId = questions[0].id;

console.log("\nValid submissions");
await submitFeedback(customer, restA.id, randomUUID(), 4, [
  { questionId: foodId, answerType: "short_answer", value: "Great noodles" },
], "en");
await submitFeedback(customer, restA.id, randomUUID(), 5, [], "vi");

let list = await loadFeedback(ownerA, restA.id);
check("feedback with text and rating-only feedback are saved", list.length === 2);

console.log("\nInvalid submissions");
const noRating = await errorCode(submitFeedback(customer, restA.id, randomUUID(), null, [], "en"));
check("missing rating is rejected", noRating === "noRating");

const badRating = await errorCode(submitFeedback(customer, restA.id, randomUUID(), 6, [], "en"));
check("rating of 6 is rejected", badRating === "noRating");

const longText = await errorCode(submitFeedback(customer, restA.id, randomUUID(), 3, [
  { questionId: foodId, answerType: "short_answer", value: "a".repeat(1001) },
], "en"));
check("answer over 1,000 characters is rejected", longText === "tooLong");

const badRestaurant = await errorCode(submitFeedback(customer, randomUUID(), randomUUID(), 3, [], "en"));
check("invalid restaurant is rejected", badRestaurant === "send");

list = await loadFeedback(ownerA, restA.id);
check("rejected submissions are not saved", list.length === 2);

console.log("\nRepeated clicks");
const sameId = randomUUID();
const answers = [{ questionId: foodId, answerType: "short_answer", value: "Too salty" }];
await submitFeedback(customer, restA.id, sameId, 2, answers, "en");
await submitFeedback(customer, restA.id, sameId, 2, answers, "en");
await submitFeedback(customer, restA.id, sameId, 2, answers, "en");

list = await loadFeedback(ownerA, restA.id);
check("clicking Submit 3 times saves only one feedback", list.length === 3);

console.log("\nOwner retrieval");
check("newest feedback is first", list[0].id === sameId);

const oldest = list[2];
check("answer is saved", oldest.responses[0].native_text === "Great noodles");
check("question text is saved", oldest.responses[0].questions.main_text === "How was the food?");
check("rating-only feedback gets Positive", list[1].sentiment === "positive");

console.log("\nOther owners");
const seenByB = await loadFeedback(ownerB, restA.id);
check("owner B cannot see owner A feedback", seenByB.length === 0);

const seenByCustomer = await loadFeedback(customer, restA.id);
check("customer cannot see feedback", seenByCustomer.length === 0);

await ownerA.from("restaurants").delete().eq("id", restA.id);
await ownerB.from("restaurants").delete().eq("id", restB.id);

console.log("\n" + failed + " failed");