export default {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.ts"],
  testTimeout: 10000,
  testMatch: ["**/tests/*.ts"],
};
