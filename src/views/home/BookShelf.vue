<template>
  <v-container>
    <v-app-bar dense flat color="white" app>
      <v-app-bar-title class="text-caption">
        阅读时长
        <span class="text-h6">{{ readTime }}</span>
        小时
      </v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn text icon small class="mr-3">
        <v-icon>{{ icon.mdiMagnify }}</v-icon>
      </v-btn>

      <v-menu bottom left offset-y close-on-click close-on-content-click transition="slide-y-transition">
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon small v-on="on" v-bind="attrs">
            <v-icon small>{{ icon.mdiDotsVertical }}</v-icon>
          </v-btn>
        </template>

        <v-list dense>
          <v-list-item dense @click="openBook">打开书籍</v-list-item>
          <v-list-item dense @click="openDir">打开文件夹</v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- 这里的padding，虽然框架是会给的，但似乎是一个动态的过程，所以手动设置一下 -->
    <v-main style='padding: 48px 0 0 0;'>
      <transition-group tag="div" type="transition" :name="canTransition ? 'flip-list' : ''" class="move">
        <template v-if="!gid">
          <v-col cols="4" sm="4" md="3" lg="2" v-for="book in bookList" :key="book.gid || book.book_path">
            <div
              class="box"
              v-longClick="() => (fab ? null : onLongTouch(book))"
              @click="() => (fab ? toggleSelect(book) : null)"
            >
              <book-card
                v-on:load-book="loadBook"
                v-if="!book.gid"
                :book="book"
                :disable="fab"
                :key="book.gid || book.book_path"
              ></book-card>
              <book-group-card v-else :books="book" :disable="fab" :key="book.gid || book.book_path"></book-group-card>
              <v-overlay class="overlay" absolute :opacity="0.3" :value="fab">
                <v-btn class="btn-select" :color="checkIsSelect(book) ? 'green' : 'white'" fab x-small>
                  <v-icon>{{ icon.mdiCheckBold }}</v-icon>
                </v-btn>
              </v-overlay>
            </div>
          </v-col>
        </template>
        <template v-else>
          <v-col cols="4" sm="4" md="3" lg="2" v-for="book in books.data" :key="book['book_path']">
            <div
              class="box"
              v-longClick="() => (fab ? null : onLongTouch(book))"
              @click="() => (fab ? toggleSelect(book) : null)"
            >
              <book-card v-on:load-book="loadBook" :book="book" :disable="fab" :key="book['book_path']"></book-card>
              <v-overlay class="overlay" absolute :opacity="0.3" :value="fab">
                <v-btn class="btn-select" :color="checkIsSelect(book) ? 'green' : 'white'" fab x-small>
                  <v-icon>{{ icon.mdiCheckBold }}</v-icon>
                </v-btn>
              </v-overlay>
            </div>
          </v-col>
        </template>
      </transition-group>
      <template>
        <div class="float-box">
          <v-tooltip left>
            <template v-slot:activator="{ on }">
              <v-fab-transition>
                <v-btn dark fab color="error" v-on="on" class="mb-4" @click="confirmDelete" v-if="fab" small>
                  <v-icon>{{ icon.mdiTrashCanOutline }}</v-icon>
                </v-btn>
              </v-fab-transition>
            </template>
            <span>删除</span>
          </v-tooltip>
          <v-fab-transition>
            <v-btn dark fab color="white" @click="toggleFab" v-if="fab" small>
              <v-badge color="primary" :content="`${selectedCount}`">
                <v-icon color="grey darken-4">{{ icon.mdiClose }}</v-icon>
              </v-badge>
            </v-btn>
          </v-fab-transition>
        </div>
      </template>
    </v-main>
  </v-container>
</template>

<script>
  import { icon } from '@/plugins/vuetify'
  import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'
  import BookCard from '@/components/home/BookCard'
  import BookGroupCard from '@/components/home/BookGroupCard'
  import longClick from '@/plugins/longClick'
  import { getReadTime, lastUpdateFromNow, saveReadTime } from '@/util/read'

  export default {
    name: 'Bookshelf',
    components: { BookGroupCard, BookCard },
    directives: {
      longClick
    },
    data() {
      return {
        showMoveDialog: false,
        showGroupEditDialog: false,
        fab: false,
        selectedBooks: [],
        icon: icon,
        time: getReadTime(),
        task: null,
        canTransition: false
      }
    },
    props: {
      gid: {
        type: String,
        default: null
      }
    },
    computed: {
      ...mapState('book', ['bookList']),
      books() {
        return this.bookList.find((item) => item.gid === this.gid)
      },
      selectedCount() {
        return this.selectedBooks.reduce((rst, { data }) => {
          return (data ? data.length : 1) + rst
        }, 0)
      },
      readTime() {
        return lastUpdateFromNow(this.time)
      }
    },
    methods: {
      ...mapActions('book', ['saveBookList']),
      ...mapMutations('book', ['updateBookList']),
      openBook() {
        console.log('从文件管理器选择一本书并打开书籍')
        window.device?.choiceBook()
      },
      openDir() {
        console.log('从文件管理器导入一个文件夹')
        window.device?.choiceDir()
      },
      loadBook(book) {
        let vue = this
        function moveToFirst(progress) {
          console.log(progress)
          if (vue.gid) {
            let index = vue.bookList.findIndex((item) => item.gid === vue.gid)
            let temp = [vue.books, ...vue.bookList]
            temp.splice(index + 1, 1)

            index = temp[0].data.findIndex((item) => item['book_path'] === book['book_path'])
            let temp2 = [book, ...temp[0].data]
            temp2.splice(index + 1, 1)
            temp[0].data = temp2
            if (progress) {
              temp[0].data[0]['read_progress'] = progress
            }
            vue.updateBookList(temp)
          } else {
            const index = vue.bookList.findIndex((item) => item['book_path'] === book['book_path'])
            let temp = [book, ...vue.bookList]
            if (progress) book['read_progress'] = progress
            temp.splice(index + 1, 1)
            vue.updateBookList(temp)
          }
        }
        window.device ? (window.moveToFirst = moveToFirst) : moveToFirst(undefined)
      },
      toggleFab() {
        this.fab = !this.fab
        if (!this.fab) {
          this.lastMoveTarget = null
          this.selectedBooks = []
        }
      },
      toggleSelect(book, forceSelect) {
        let key = `${book.gid}_${book.book_path}`
        let add
        if (forceSelect === 1) {
          add = true
        } else if (forceSelect === -1) {
          add = false
        } else {
          add = !this.checkIsSelect(book)
        }
        if (add) {
          this.selectedBooks = [...this.selectedBooks, book]
        } else {
          this.selectedBooks = this.selectedBooks.filter(({ gid, book_path }) => `${gid}_${book_path}` !== key)
        }
      },
      onLongTouch(book) {
        this.fab = true
        this.toggleSelect(book, 1)
      },
      checkIsSelect(book) {
        let key = `${book.gid}_${book.book_path}`
        return !!this.selectedBooks.find(({ gid, book_path }) => `${gid}_${book_path}` === key)
      },
      confirmDelete() {
        if (this.selectedCount === 0) return
        let r = window.confirm(`确认删除选中的 ${this.selectedCount} 本书？`)
        if (r) {
          Promise.resolve()
            .then(() => {
              let books = this.bookList
                .filter((g) => {
                  return !this.selectedBooks.find(
                    (item) => `${item.gid}_${item.book_path}` === `${g.gid}_${g.book_path}`
                  )
                })
                .map((g) => {
                  return {
                    ...g,
                    data: (g.data || []).filter((b) => {
                      return !this.selectedBooks.find(
                        (item) => `${item.gid}_${item.book_path}` === `${b.gid}_${b.book_path}`
                      )
                    })
                  }
                })
              this.updateBookList(books)
              return this.$nextTick()
            })
            .then(() => {
              this.toggleFab()
            })
        }
      }
    },
    mounted() {
      this.task = setInterval(() => {
        this.time = getReadTime()
      }, 1000)
      this.canTransition = true
    },
    beforeDestroy() {
      if (this.task) {
        clearInterval(this.task)
      }
    },
    updated() {
      this.canTransition = true
    },
    beforeRouteUpdate(to, from, next) {
      this.canTransition = false
      next()
    }
  }
</script>

<style scoped lang="scss">
  @import '../../assets/styles/mixin';

  .card-box {
    position: relative;
    cursor: pointer;
    .overlay {
      bottom: 60px;
      align-items: flex-start !important;
      justify-content: flex-end !important;
      z-index: 3 !important;

      .btn-select {
        margin-top: -16px;
        margin-right: -10px;
      }
    }
    .category-text {
      @include ellipsis2(2);
    }
  }

  .move {
    display: flex;
    flex-wrap: wrap;
    flex: 1 1 auto;

    .flip-list-move {
      transition: all 0.5s;
    }

    .flip-list-enter-active,
    .flip-list-leave-active {
      transition: all 0.5s;
    }

    .flip-list-leave-active {
      position: absolute;
    }

    .flip-list-enter,
    .flip-list-leave-to {
      opacity: 0;
      transform: scale(0);
      max-width: 0;
      flex-basis: 0;
    }
  }
  .float-box {
    position: fixed;
    right: 24px;
    bottom: 24px;
    display: flex;
    flex-direction: column;
    z-index: 100;
  }
  .box {
    position: relative;
    .overlay {
      bottom: 60px;
      align-items: flex-start !important;
      justify-content: flex-end !important;
      z-index: 3 !important;

      .btn-select {
        margin-top: -16px;
        margin-right: -10px;
      }

      pointer-events: none;
      > .v-overlay__content {
        pointer-events: auto;
      }
    }
  }
</style>
