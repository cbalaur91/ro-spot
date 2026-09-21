export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      place_duplicate_flags: {
        Row: {
          created_at: string
          distance_m: number
          name_similarity: number
          place_id: string
          similar_place_id: string
        }
        Insert: {
          created_at?: string
          distance_m: number
          name_similarity: number
          place_id: string
          similar_place_id: string
        }
        Update: {
          created_at?: string
          distance_m?: number
          name_similarity?: number
          place_id?: string
          similar_place_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_duplicate_flags_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_duplicate_flags_similar_place_id_fkey"
            columns: ["similar_place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string
          author_id: string | null
          category: Database["public"]["Enums"]["place_category"]
          created_at: string
          description: string
          id: string
          lat: number
          lng: number
          name: string
          phone: string | null
          photo_paths: string[]
          social_url: string | null
          status: Database["public"]["Enums"]["place_status"]
          website: string | null
        }
        Insert: {
          address: string
          author_id?: string | null
          category: Database["public"]["Enums"]["place_category"]
          created_at?: string
          description: string
          id?: string
          lat: number
          lng: number
          name: string
          phone?: string | null
          photo_paths?: string[]
          social_url?: string | null
          status?: Database["public"]["Enums"]["place_status"]
          website?: string | null
        }
        Update: {
          address?: string
          author_id?: string | null
          category?: Database["public"]["Enums"]["place_category"]
          created_at?: string
          description?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          phone?: string | null
          photo_paths?: string[]
          social_url?: string | null
          status?: Database["public"]["Enums"]["place_status"]
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      place_duplicate_review: {
        Row: {
          distance_m: number | null
          name_similarity: number | null
          place_id: string | null
          similar_address: string | null
          similar_name: string | null
          similar_place_id: string | null
          similar_status: Database["public"]["Enums"]["place_status"] | null
          submitted_address: string | null
          submitted_at: string | null
          submitted_name: string | null
          submitted_status: Database["public"]["Enums"]["place_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "place_duplicate_flags_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_duplicate_flags_similar_place_id_fkey"
            columns: ["similar_place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      places_distance_m: {
        Args: { lat_a: number; lat_b: number; lng_a: number; lng_b: number }
        Returns: number
      }
      places_look_alike: {
        Args: {
          lat_a: number
          lat_b: number
          lng_a: number
          lng_b: number
          name_a: string
          name_b: string
        }
        Returns: boolean
      }
      places_name_similarity: {
        Args: { name_a: string; name_b: string }
        Returns: number
      }
    }
    Enums: {
      place_category: "historic" | "food_drink" | "services"
      place_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      place_category: ["historic", "food_drink", "services"],
      place_status: ["pending", "approved", "rejected"],
    },
  },
} as const
