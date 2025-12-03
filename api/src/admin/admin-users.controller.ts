      // api/src/admin/admin-users.controller.ts
      import {
        Controller,
        Get,
        Param,
        Patch,
        Body,
        UseGuards,
        Delete,
      } from "@nestjs/common";
      import { PrismaService } from "../prisma/prisma.service";
      import { JwtAuthGuard } from "../auth/jwt-auth.guard";
      import { RolesGuard } from "../auth/roles.guard";
      import { Roles } from "../auth/roles.decorator";
      import { Role } from "@prisma/client";

      @Controller("admin/users")
      @UseGuards(JwtAuthGuard, RolesGuard)
      @Roles(Role.ADMIN)
      export class AdminUsersController {
        constructor(private prisma: PrismaService) {}

        @Get()
        async findAll() {
          return this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              verified: true,
              createdAt: true,
              Artist: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          });
        }

        @Patch(':id')
        async updateUser(
          @Param('id') id: string,
          @Body()
          body: {
            name?: string;
            role?: Role;
            verified?: boolean;
          },
        ) {
          return this.prisma.user.update({
            where: { id },
            data: {
              ...(body.name !== undefined && { name: body.name }),
              ...(body.role !== undefined && { role: body.role }),
              ...(body.verified !== undefined && { verified: body.verified }),
            },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              verified: true,
            },
          });
        }

        @Delete(':id')
        async deleteUser(@Param('id') id: string) {
          return this.prisma.user.delete({ where: { id } });
        }
      }
