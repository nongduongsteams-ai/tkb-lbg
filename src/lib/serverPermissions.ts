import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRolePermissions } from "@/actions/config";
import { SystemAction } from "./permissions";
import { prisma } from "@/lib/prisma";

export async function getEffectiveActions(session: any) {
  const allowedActions = new Set<string>();
  if (!session?.user) return allowedActions;
  
  
  // Fetch latest role and permissions from DB to avoid stale session data
  const dbUser = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { role: true, permissions: true }
  });
  
  const role = dbUser?.role || (session.user.role as string);
  const permissions = dbUser?.permissions || (session.user.permissions as string[] || []);

  if (role === "ADMIN") {
    allowedActions.add("ADMIN");
    return allowedActions;
  }
  

  const mappings = await getRolePermissions();
  
  if (mappings[role]) mappings[role].forEach(a => allowedActions.add(a));
  else {
    Object.keys(mappings).forEach(key => {
      if (role.includes(key)) mappings[key].forEach(a => allowedActions.add(a));
    });
  }

  permissions.forEach(p => {
    if (mappings[p]) mappings[p].forEach(a => allowedActions.add(a));
    else {
      Object.keys(mappings).forEach(key => {
        if (p.includes(key)) mappings[key].forEach(a => allowedActions.add(a));
      });
    }
  });
  
  return allowedActions;
}

export async function canViewFullTimetable(session: any, effectiveActions: Set<string>) {
  if (!session?.user) return false;
  if (effectiveActions.has("ADMIN") || effectiveActions.has("MANAGE_TIMETABLE") || effectiveActions.has("VIEW_ALL_LBG")) {
    return true;
  }
  
  // Fetch latest role and permissions from DB
  const dbUser = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { role: true, permissions: true }
  });

  const role = dbUser?.role || (session.user.role as string);
  const permissions = dbUser?.permissions || (session.user.permissions as string[] || []);
  
  const fullAccessRoles = ['BGH', 'BGH HT', 'BGH PHT', 'Tổ trưởng', 'Tổ phó'];
  
  if (fullAccessRoles.some(r => role.includes(r))) return true;
  if (permissions.some(p => fullAccessRoles.some(r => p.includes(r)))) return true;
  
  return false;
}

export async function requireAction(action: SystemAction) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  
  const role = (session.user as any).role as string;
  if (role === "ADMIN") return true;

  const permissions = (session.user as any).permissions as string[] || [];
  
  const mappings = await getRolePermissions();
  const allowedActions = new Set<string>();
  
  if (mappings[role]) mappings[role].forEach(a => allowedActions.add(a));
  permissions.forEach(p => {
    if (mappings[p]) mappings[p].forEach(a => allowedActions.add(a));
  });
  
  if (!allowedActions.has(action)) {
    throw new Error("Permission denied. Missing action: " + action);
  }
  return true;
}
