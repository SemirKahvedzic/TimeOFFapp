/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  preset: "ts-jest",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  globals: {
    "ts-jest": {
      tsconfig: { module: "CommonJS", esModuleInterop: true },
    },
  },
};
