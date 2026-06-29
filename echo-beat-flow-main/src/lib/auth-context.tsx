import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);

      console.log("===== AUTH SESSION =====");
      console.log(s);
      console.log("========================");

      if (s?.user) {
        setTimeout(() => {
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", s.user.id)
            .eq("role", "admin")
            .maybeSingle()
            .then(({ data, error }) => {
              console.log("================================");
              console.log("Logged in Email:", s.user.email);
              console.log("Logged in UID:", s.user.id);
              console.log("Admin Query Result:", data);
              console.log("Admin Query Error:", error);
              console.log("isAdmin:", !!data);
              console.log("================================");

              setIsAdmin(!!data);
            });
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthCtx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        isAdmin,
        signOut,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
// import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
// import type { Session, User } from "@supabase/supabase-js";
// import { supabase } from "@/integrations/supabase/client";

// interface AuthState {
//   user: User | null;
//   session: Session | null;
//   loading: boolean;
//   isAdmin: boolean;
//   signOut: () => Promise<void>;
// }

// const AuthCtx = createContext<AuthState | null>(null);

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [session, setSession] = useState<Session | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [isAdmin, setIsAdmin] = useState(false);

//   useEffect(() => {
//     const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
//       setSession(s);
//       if (s?.user) {
//         // defer admin check
//         setTimeout(() => {
//           supabase
//             .from("user_roles")
//             .select("role")
//             .eq("user_id", s.user.id)
//             .eq("role", "admin")
//             .maybeSingle()
//             .then(({ data }) => setIsAdmin(!!data));
//         }, 0);
//       } else {
//         setIsAdmin(false);
//       }
//     });
//     supabase.auth.getSession().then(({ data }) => {
//       setSession(data.session);
//       setLoading(false);
//     });
//     return () => sub.subscription.unsubscribe();
//   }, []);

//   const signOut = async () => {
//     await supabase.auth.signOut();
//   };

//   return (
//     <AuthCtx.Provider value={{ user: session?.user ?? null, session, loading, isAdmin, signOut }}>
//       {children}
//     </AuthCtx.Provider>
//   );
// }

// export function useAuth() {
//   const ctx = useContext(AuthCtx);
//   if (!ctx) throw new Error("useAuth must be inside AuthProvider");
//   return ctx;
// }
