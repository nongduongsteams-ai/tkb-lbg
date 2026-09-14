'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getBranchData(schoolYear: string) {
  try {
    // Chạy song song vì hai query độc lập nhau
    const [classes, teachers] = await Promise.all([
      prisma.class.findMany({
        where: { schoolYear },
        orderBy: [{ grade: 'asc' }, { name: 'asc' }],
      }),
      prisma.user.findMany({
        where: { role: { in: ['BGH', 'GV'] } },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { classes, teachers };
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu phân hiệu:', error);
    throw new Error('Không thể lấy dữ liệu phân hiệu');
  }
}

export async function updateClassBranch(classId: string, branch: string) {
  try {
    await prisma.class.update({
      where: { id: classId },
      data: { branch },
    });
    revalidatePath('/dashboard/branches');
    revalidatePath('/dashboard/classes');
    return { success: true };
  } catch (error) {
    console.error('Lỗi cập nhật phân hiệu lớp:', error);
    return { success: false, error: 'Lỗi cập nhật' };
  }
}

export async function updateUserBranch(userId: string, branch: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { branch },
    });
    revalidatePath('/dashboard/branches');
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (error) {
    console.error('Lỗi cập nhật phân hiệu GV:', error);
    return { success: false, error: 'Lỗi cập nhật' };
  }
}
