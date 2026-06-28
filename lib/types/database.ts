export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SessionStatus = "planned" | "in_progress" | "completed" | "skipped";

export type WeightUnit = "kg" | "lb";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          unit_preference: WeightUnit;
          rest_seconds: number;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          unit_preference?: WeightUnit;
          rest_seconds?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          unit_preference?: WeightUnit;
          rest_seconds?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      exercises: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          description: string | null;
          muscle_group: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          description?: string | null;
          muscle_group?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          description?: string | null;
          muscle_group?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercises_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_plans: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_plans_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_exercises: {
        Row: {
          id: string;
          plan_id: string;
          exercise_id: string | null;
          order_index: number;
          target_sets: number;
          target_reps: number;
          target_weight: number;
        };
        Insert: {
          id?: string;
          plan_id: string;
          exercise_id?: string | null;
          order_index?: number;
          target_sets: number;
          target_reps: number;
          target_weight: number;
        };
        Update: {
          id?: string;
          plan_id?: string;
          exercise_id?: string | null;
          order_index?: number;
          target_sets?: number;
          target_reps?: number;
          target_weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "plan_exercises_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plan_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sessions: {
        Row: {
          id: string;
          plan_id: string | null;
          user_id: string;
          status: SessionStatus;
          scheduled_date: string;
          completed_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          plan_id?: string | null;
          user_id: string;
          status?: SessionStatus;
          scheduled_date: string;
          completed_at?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          plan_id?: string | null;
          user_id?: string;
          status?: SessionStatus;
          scheduled_date?: string;
          completed_at?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      session_logs: {
        Row: {
          id: string;
          session_id: string;
          plan_exercise_id: string | null;
          set_number: number;
          actual_reps: number | null;
          actual_weight: number | null;
          completed: boolean;
        };
        Insert: {
          id?: string;
          session_id: string;
          plan_exercise_id?: string | null;
          set_number: number;
          actual_reps?: number | null;
          actual_weight?: number | null;
          completed?: boolean;
        };
        Update: {
          id?: string;
          session_id?: string;
          plan_exercise_id?: string | null;
          set_number?: number;
          actual_reps?: number | null;
          actual_weight?: number | null;
          completed?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "session_logs_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_logs_plan_exercise_id_fkey";
            columns: ["plan_exercise_id"];
            isOneToOne: false;
            referencedRelation: "plan_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

// Convenience row aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type WorkoutPlan = Database["public"]["Tables"]["workout_plans"]["Row"];
export type PlanExercise =
  Database["public"]["Tables"]["plan_exercises"]["Row"];
export type WorkoutSession =
  Database["public"]["Tables"]["workout_sessions"]["Row"];
export type SessionLog = Database["public"]["Tables"]["session_logs"]["Row"];
