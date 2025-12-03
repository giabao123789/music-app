const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

(async () => {
  const email = 'admin@web';   // đổi nếu muốn
  const rawPass = 'admin123';         // mật khẩu muốn dùng //
  const pass = await bcrypt.hash(rawPass, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: pass, role: 'ADMIN', name: 'Admin' },
    create: { email, name: 'Admin', password: pass, role: 'ADMIN' },
  });

  console.log('✅ Admin ready:', { email, password: rawPass, id: user.id });
  await prisma.$disconnect();
})();
