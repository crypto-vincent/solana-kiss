export default {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.ts"],
  testTimeout: 100 * 1000,
  testMatch: ["**/tests/*.test.ts"],
};
