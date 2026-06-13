import { z } from "zod";

const emptyToUndef = (v: unknown) => (v === "" || v == null ? undefined : v);

const optStr = z.preprocess(emptyToUndef, z.string().trim().optional());
const optNum = z.preprocess(
  emptyToUndef,
  z.coerce.number().finite().optional(),
);

export const graduateInputSchema = z.object({
  lcn: z.string().trim().min(1, "License number is required"),
  name: optStr,
  firstName: optStr,
  middleName: optStr,
  lastName: optStr,
  suffix: optStr,
  phone: optStr,
  gender: optStr,
  streetAddress: optStr,
  city: optStr,
  province: optStr,
  town: optStr,
  country: optStr,
  postalCode: optStr,
  latitude: optNum,
  longitude: optNum,
  mapsUrl: optStr,
  issuedRaw: optStr,
  expirationRaw: optStr,
  registrationRaw: optStr,
  scoreFWE: optNum,
  scoreSJE: optNum,
  scoreEP: optNum,
  scorePAS: optNum,
  scoreCCST: optNum,
  scoreCCSM: optNum,
  // Signed bonus/reconciliation in Total Evaluation points — its own line in
  // the proficiency breakdown. Total = six + bonus.
  bonusPoints: optNum,
  ranking: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().min(0).max(3).optional(),
  ),
  status: z.enum(["STUDENT", "GRADUATE", "ARCHIVED"]).default("GRADUATE"),
  legacy: z.preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.boolean(),
  ),
  batchCode: optStr,
  notes: optStr,
});

export type GraduateInput = z.infer<typeof graduateInputSchema>;

export const studentInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  middleName: optStr,
  lastName: z.string().trim().min(1, "Last name is required"),
  suffix: optStr,
  phone: optStr,
  gender: optStr,
  streetAddress: optStr,
  city: optStr,
  province: optStr,
  town: optStr,
  country: optStr,
  postalCode: optStr,
  latitude: optNum,
  longitude: optNum,
  mapsUrl: optStr,
  batchCode: optStr,
  // Periodic quiz raw scores (stored in granularGrades JSON)
  q1: optNum,
  q2: optNum,
  q3: optNum,
  q4: optNum,
  q5: optNum,
  q6: optNum,
  q7: optNum,
  q8: optNum,
  q9: optNum,
  q10: optNum,
  // Practical exam raw scores
  scoreFWE: optNum,
  scoreEP: optNum,
  scorePAS: optNum,
  scoreCCST: optNum,
  scoreCCSM: optNum,
});

export type StudentInput = z.infer<typeof studentInputSchema>;

export const inquiryInputSchema = z.object({
  name: z.string().trim().min(1, "Your name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: optStr,
  program: z.preprocess(
    (v) => (v == null || v === "" ? "GENERAL" : v),
    z.enum(["BLS", "EMR", "EMT", "SPECIALIZED", "GENERAL"]),
  ),
  message: optStr,
});

export type InquiryInput = z.infer<typeof inquiryInputSchema>;

export const testimonialInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  batchCode: optStr,
  quote: z.string().trim().min(1, "Quote is required"),
  rating: z.preprocess(
    (v) => (v == null || v === "" ? 5 : v),
    z.coerce.number().int().min(1).max(5),
  ),
});

export type TestimonialInput = z.infer<typeof testimonialInputSchema>;

export const teamMemberInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  role: z.string().trim().min(1, "Role is required"),
  credentials: optStr,
  photoUrl: optStr,
});

export type TeamMemberInput = z.infer<typeof teamMemberInputSchema>;
