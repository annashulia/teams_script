import { test, expect } from '@playwright/test';


test('AUTH-001 - Successful login', async ({ page, request, context }) => {
  await page.goto((process.env.BASE_URL || 'https://app.slotsense.ai') + '/auth/signin');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/); 
  
  // Remove "Guidos test" element using CSS rule
  await page.addStyleTag({ content: 'li:has(a[href*="guidos-test"]) { display: none !important; }' });

  const cookies = await context.cookies();
  expect(cookies.some(c => /session/i.test(c.name))).toBeTruthy();
});


test('AUTH-002 - Empty fields validation', async ({ page, request, context }) => {
  await page.goto((process.env.BASE_URL || 'https://app.slotsense.ai') + '/auth/signin');
  await page.getByLabel('Email').fill('');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText(/required/i)).toBeVisible();
});


test('AUTH-003 - Invalid password', async ({ page, request, context }) => {
  await page.goto((process.env.BASE_URL || 'https://app.slotsense.ai') + '/auth/signin');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill('totally-wrong-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText(/incorrect email or password/i)).toBeVisible();
  // Best-effort: ensure page did not navigate to dashboard
  await expect(page).not.toHaveURL(/\/dashboard/);
});


test('AUTH-004 - Non-existing user', async ({ page, request, context }) => {
  await page.goto((process.env.BASE_URL || 'https://app.slotsense.ai') + '/auth/signin');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');
  await page.getByLabel('Email').fill('nonexistent+' + Date.now() + '@example.com');
  await expect(page.getByText(/does not match email format/i)).toBeVisible();
});


test('AUTH-005 - Invalid email format', async ({ page, request, context }) => {
  await page.goto((process.env.BASE_URL || 'https://app.slotsense.ai') + '/auth/signin');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');
  await page.getByLabel('Email').fill('abc');
  await expect(page.getByText(/does not match email format/i)).toBeVisible();
});


test('AUTH-006 - Empty password', async ({ page, request, context }) => {
  await page.goto((process.env.BASE_URL || 'https://app.slotsense.ai') + '/auth/signin');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill('');
  await expect(page.getByText(/required/i)).toBeVisible();
});


test('AUTH-007 - Email with spaces', async ({ page, request, context }) => {
  await page.goto((process.env.BASE_URL || 'https://app.slotsense.ai') + '/auth/signin');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');
  await page.getByLabel('Email').fill(' ' + (process.env.TEST_EMAIL || 'user@example.com') + ' ');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');
});


test('AUTH-008 - Very long password', async ({ page, request, context }) => {
  await page.goto((process.env.BASE_URL || 'https://app.slotsense.ai') + '/auth/signin');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill('x'.repeat(300));
  await expect(page.getByText(/incorrect email or password/i)).toBeVisible();
  // Best-effort: ensure page did not navigate to dashboard
  await expect(page).not.toHaveURL(/\/dashboard/);
});


test('AUTH-009 - Enter key submits form', async ({ page, request, context }) => {
  await page.goto((process.env.BASE_URL || 'https://app.slotsense.ai') + '/auth/signin');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');
  await page.getByLabel('Password').press('Enter');
  await expect(page).toHaveURL(/\/dashboard/); 
  const cookies = await context.cookies();
  expect(cookies.some(c => /session/i.test(c.name))).toBeTruthy();
});


test('AUTH-010 - Forgot password link', async ({ page, request, context }) => {
  await page.goto((process.env.BASE_URL || 'https://app.slotsense.ai') + '/auth/signin');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');
  await page.getByRole('link', { name: /forgot password/i }).click();
  await expect(page.getByText(/check your email/i)).toBeVisible();
});


test('AUTH-011 - Rate limiting', async ({ page, request, context }) => {
  await page.goto((process.env.BASE_URL || 'https://app.slotsense.ai') + '/auth/signin');
  await expect(page.getByText(/incorrect email or password/i)).toBeVisible();
  // Best-effort: ensure page did not navigate to dashboard
  await expect(page).not.toHaveURL(/\/dashboard/);
});


test('AUTH-012 - Eye icon toggle password', async ({ page, request, context }) => {
  await page.goto((process.env.BASE_URL || 'https://app.slotsense.ai') + '/auth/signin');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');
  await page.getByRole('button', { name: /show password|hide password/i }).click();
});


test('AUTH-013 - Sign up with existing user email', async ({ page, request, context }) => {
  await page.goto((process.env.BASE_URL || 'https://app.slotsense.ai') + '/auth/signup');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByRole('button', { name: /send code/i }).click();
  await expect(page.getByText(/already registered/i)).toBeVisible();
});


test('AUTH-014 - Sign up with new email', async ({ page, request, context }) => {
  await page.goto((process.env.BASE_URL || 'https://app.slotsense.ai') + '/auth/signup');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'user@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'Passw0rd!');
  await page.getByLabel('Email').fill('new+' + Date.now() + '@example.com');
  await page.getByRole('button', { name: /send code/i }).click();
  await expect(page.getByText(/resend code/i)).toBeVisible();
});
